'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus, Eye, XCircle, Pencil, RotateCcw,
  Inbox, CheckCircle2, Clock, AlertCircle, FileText, Send,
  Search, Filter, Download, ChevronLeft, ChevronRight, AlertTriangle,
  TrendingUp, BarChart3, PieChart, CalendarDays, ArrowUpRight,
  MessageSquare, Paperclip, User, Shield, Zap, X, ChevronDown,
  LayoutGrid, List, Calendar, ArrowUp, ArrowDown, Activity,
  Timer, Heart, ChevronUp, ExternalLink, Hash, Globe,
  Columns3, Rows3, SortAsc, SortDesc,
  Upload, FileEdit, Trash2, PlusCircle, Copy,
  Save, Layers, Bed, RefreshCw, CheckCheck,
} from 'lucide-react';
import type { Request } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  timeAgo, formatDate, daysUntil, getRequestAge, priorityWeight,
  ProgressRing, DonutChart, LiveClock,
  priorityDot, priorityLabel,
  requestTypeConfig as typeConfig,
  requestTypeColors as typeColors,
  requestTypeColorHex as typeColorHex,
  slaDays,
  PageSkeleton,
} from './shared';

/* ═══════════════════════════════════════════════════════════════
   TYPE CONFIG (imported from ./shared as typeConfig)
   ═══════════════════════════════════════════════════════════════ */

/* ─── SLA CONFIG (imported from ./shared) ─── */

const statusFilters = ['all', 'pending', 'under-review', 'approved', 'rejected', 'cancelled', 'escalated'] as const;
type StatusFilter = typeof statusFilters[number];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Priority' },
  { value: 'amount', label: 'Amount' },
  { value: 'due-date', label: 'Due Date' },
] as const;

/* ═══════════════════════════════════════════════════════════════
   HELPERS (timeAgo, priorityWeight, formatDate, daysUntil, getRequestAge imported from ./shared)
   ═══════════════════════════════════════════════════════════════ */

function getSlaStatus(req: Request): { pct: number; status: 'on-track' | 'at-risk' | 'breached'; daysRemaining: number } {
  const limit = slaDays[req.priority] || 7;
  const age = getRequestAge(req.createdAt);
  const pct = Math.min((age / limit) * 100, 100);
  const daysRemaining = limit - age;
  if (req.status === 'approved' || req.status === 'rejected' || req.status === 'cancelled') {
    return { pct, status: 'on-track', daysRemaining };
  }
  if (pct >= 100) return { pct, status: 'breached', daysRemaining: Math.max(0, daysRemaining) };
  if (pct >= 75) return { pct, status: 'at-risk', daysRemaining };
  return { pct, status: 'on-track', daysRemaining };
}

/* ═══════════════════════════════════════════════════════════════
   FORM STATE
   ═══════════════════════════════════════════════════════════════ */
type FormState = {
  type: Request['type'];
  title: string;
  description: string;
  priority: Request['priority'];
  amount: string;
  dueDate: string;
  dynamicFields: Record<string, string>;
};

const emptyForm = (): FormState => ({
  type: 'leave', title: '', description: '', priority: 'medium', amount: '', dueDate: '', dynamicFields: {},
});

/* ═══════════════════════════════════════════════════════════════
   COMMENT TYPE
   ═══════════════════════════════════════════════════════════════ */
interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  isReviewer: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   SVG CHART COMPONENTS (DonutChart, LiveClock, ProgressRing imported from ./shared)
   ═══════════════════════════════════════════════════════════════ */

function BarChart({ data, height = 120 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium">{d.value}</span>
            <div className="w-full bg-black/[0.03] dark:bg-white/[0.05] rounded-t-sm overflow-hidden" style={{ height: height - 28 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                className="w-full rounded-t-sm"
                style={{ backgroundColor: d.color || '#10b981', marginTop: `${100 - pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, height = 100 }: { data: { label: string; value: number }[]; height?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range = maxVal - minVal || 1;
  const w = 240;
  const h = height;
  const pad = 8;

  const points = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2),
    y: h - pad - ((d.value - minVal) / range) * (h - pad * 2),
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = pathData + ` L ${points[points.length - 1]?.x || w - pad} ${h - pad} L ${points[0]?.x || pad} ${h - pad} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(6,182,212,0.3)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0.02)" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#lineGrad)" />
      <path d={pathData} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#06b6d4" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      ))}
    </svg>
  );
}

function HorizontalBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs truncate max-w-[120px]">{d.label}</span>
            <span className="text-xs font-medium">{d.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.value / maxVal) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
              className="h-full rounded-full" style={{ backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLA INDICATOR COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function SlaIndicator({ req, compact }: { req: Request; compact?: boolean }) {
  const sla = getSlaStatus(req);
  if (req.status === 'approved' || req.status === 'rejected' || req.status === 'cancelled') return null;

  const colorMap = { 'on-track': 'bg-emerald-500', 'at-risk': 'bg-amber-500', 'breached': 'bg-rose-500' };
  const textColorMap = { 'on-track': 'text-emerald-400', 'at-risk': 'text-amber-400', 'breached': 'text-rose-400' };
  const labelMap = { 'on-track': 'On Track', 'at-risk': 'At Risk', 'breached': 'Breached' };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', textColorMap[sla.status])}>
        <div className={cn('h-1.5 w-1.5 rounded-full', colorMap[sla.status], sla.status === 'breached' && 'animate-pulse')} />
        <span className="text-[10px]">{sla.daysRemaining}d</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">SLA</span>
        <span className={cn('text-[10px] font-semibold', textColorMap[sla.status])}>{labelMap[sla.status]}</span>
      </div>
      <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${sla.pct}%` }}
          transition={{ duration: 0.6 }}
          className={cn('h-full rounded-full', colorMap[sla.status])}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{slaDays[req.priority] || 7}d target</span>
        <span className={cn('text-[10px] font-medium', textColorMap[sla.status])}>
          {sla.daysRemaining > 0 ? `${sla.daysRemaining}d left` : 'Overdue'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APPROVAL WORKFLOW STEPPER
   ═══════════════════════════════════════════════════════════════ */
function ApprovalStepper({ status, reviewerName }: { status: Request['status']; reviewerName?: string }) {
  const steps = [
    { key: 'submitted', label: 'Submitted', icon: FileText, done: true },
    { key: 'under-review', label: 'Under Review', icon: Eye, done: ['under-review', 'approved', 'rejected', 'escalated'].includes(status) },
    { key: 'decision', label: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : status === 'escalated' ? 'Escalated' : 'Decision', icon: status === 'approved' ? CheckCircle2 : status === 'rejected' ? XCircle : status === 'escalated' ? AlertTriangle : Clock, done: ['approved', 'rejected'].includes(status) },
  ];

  const activeIdx = status === 'pending' ? 0 : status === 'under-review' ? 1 : status === 'escalated' ? 1 : 2;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        const isCurrent = i === activeIdx && !['approved', 'rejected'].includes(status);
        const isDone = step.done;
        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                isDone && 'border-emerald-500 bg-emerald-500/20',
                isCurrent && 'border-cyan-500 bg-cyan-500/20 animate-pulse',
                !isDone && !isCurrent && 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05]',
              )}>
                <StepIcon className={cn('h-3.5 w-3.5', isDone && 'text-emerald-400', isCurrent && 'text-cyan-400', !isDone && !isCurrent && 'text-muted-foreground')} />
              </div>
              <span className={cn('text-[9px] mt-1 text-center truncate max-w-[80px]', isDone && 'text-emerald-400', isCurrent && 'text-cyan-400', !isDone && !isCurrent && 'text-muted-foreground')}>
                {step.label}
              </span>
              {i === 1 && reviewerName && isDone && <span className="text-[8px] text-muted-foreground truncate max-w-[80px]">{reviewerName}</span>}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 -mt-4', isDone ? 'bg-emerald-500/50' : 'bg-black/[0.06] dark:bg-white/[0.1]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LIVE CLOCK (imported from ./shared)
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   PROGRESS RING (imported from ./shared)
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function EmployeeRequestCenter() {
  const { user, requests, createRequest, updateRequest, setActiveView, setSelectedRequestId } = useEMSStore();

  // ─── Loading state ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  const myRequests = useMemo(() => requests.filter(r => r.userId === user?.id), [requests, user?.id]);

  // Main tab
  const [mainTab, setMainTab] = useState('all-requests');

  // All Requests tab state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [tableSortKey, setTableSortKey] = useState<string>('createdAt');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Escalate dialog state
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateUrgency, setEscalateUrgency] = useState<string>('high');
  const [escalatingReqId, setEscalatingReqId] = useState<string | null>(null);

  // Comments (local state for demo)
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Approval prediction
  const [approvalPrediction, setApprovalPrediction] = useState<{ rate: number; totalSimilar: number; tip: string } | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const predictionCache = useRef<Record<string, { rate: number; totalSimilar: number; tip: string }>>({});
  const predictionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Drafts
  const [drafts, setDrafts] = useState<Array<{ id: string; form: FormState; savedAt: string }>>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const currentDraftIdRef = useRef<string | null>(null);

  // Bulk submission
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{ id: string; type: Request['type']; title: string; amount: string; priority: Request['priority'] }>>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const pending = myRequests.filter(r => r.status === 'pending').length;
    const underReview = myRequests.filter(r => r.status === 'under-review').length;
    const approved = myRequests.filter(r => r.status === 'approved').length;
    const rejected = myRequests.filter(r => r.status === 'rejected').length;
    const escalated = myRequests.filter(r => r.status === 'escalated').length;
    const totalAmount = myRequests.reduce((s, r) => s + (r.amount || 0), 0);

    // Approval rate
    const decided = myRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
    const approvalRate = decided.length > 0 ? Math.round((approved / decided.length) * 100) : 0;

    // Avg processing time
    const resolved = myRequests.filter(r => r.resolvedAt && r.createdAt);
    const avgProcessingDays = resolved.length > 0
      ? Math.round(resolved.reduce((sum, r) => {
          const days = (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / resolved.length * 10) / 10
      : 0;

    // Approved this month
    const now = new Date();
    const approvedThisMonth = myRequests.filter(r =>
      r.status === 'approved' && r.resolvedAt &&
      new Date(r.resolvedAt).getMonth() === now.getMonth() &&
      new Date(r.resolvedAt).getFullYear() === now.getFullYear()
    ).length;

    // SLA compliance
    const activeReqs = myRequests.filter(r => !['approved', 'rejected', 'cancelled'].includes(r.status));
    const slaCompliant = activeReqs.filter(r => getSlaStatus(r).status !== 'breached').length;
    const slaRate = activeReqs.length > 0 ? Math.round((slaCompliant / activeReqs.length) * 100) : 100;

    return { total: myRequests.length, pending, underReview, approved, rejected, escalated, totalAmount, approvalRate, avgProcessingDays, approvedThisMonth, slaRate };
  }, [myRequests]);

  // Health score (composite: approval rate 40% + SLA 30% + active status 30%)
  const healthScore = useMemo(() => {
    const activeOk = myRequests.length > 0
      ? Math.round(((stats.approved + stats.underReview) / stats.total) * 100)
      : 100;
    return Math.round(stats.approvalRate * 0.4 + stats.slaRate * 0.3 + activeOk * 0.3);
  }, [stats, myRequests]);

  /* ─── Filtered & Sorted Requests ─── */
  const filtered = useMemo(() => {
    let list = [...myRequests];

    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
    if (priorityFilter !== 'all') list = list.filter(r => r.priority === priorityFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case 'newest': list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'priority': list.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)); break;
      case 'amount': list.sort((a, b) => (b.amount || 0) - (a.amount || 0)); break;
      case 'due-date': list.sort((a, b) => { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); }); break;
    }

    return list;
  }, [myRequests, statusFilter, typeFilter, priorityFilter, searchQuery, sortBy]);

  /* ─── Table sorted list ─── */
  const tableSorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (tableSortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'priority': cmp = priorityWeight(b.priority) - priorityWeight(a.priority); break;
        case 'amount': cmp = (a.amount || 0) - (b.amount || 0); break;
        case 'dueDate': cmp = (a.dueDate || '').localeCompare(b.dueDate || ''); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'createdAt': default: cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return tableSortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, tableSortKey, tableSortDir]);

  /* ─── By Type Grouped ─── */
  const groupedByType = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    for (const req of myRequests) { if (!groups[req.type]) groups[req.type] = []; groups[req.type].push(req); }
    return groups;
  }, [myRequests]);

  /* ─── Calendar Requests ─── */
  const calendarRequests = useMemo(() => {
    return myRequests.filter(r => { const date = r.dueDate || r.createdAt; const d = new Date(date); return d.getMonth() === calMonth && d.getFullYear() === calYear; });
  }, [myRequests, calMonth, calYear]);

  const requestsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return calendarRequests.filter(r => { const date = r.dueDate || r.createdAt; return new Date(date).getDate() === selectedDay; });
  }, [calendarRequests, selectedDay]);

  /* ─── Analytics ─── */
  const analytics = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    for (const r of myRequests) { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; }

    const statusCounts: Record<string, number> = {};
    for (const r of myRequests) { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; }

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const count = myRequests.filter(r => { const rd = new Date(r.createdAt); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear(); }).length;
      monthlyTrend.push({ month: monthStr, count });
    }

    const decided = myRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
    const approvalRate = decided.length > 0 ? Math.round((stats.approved / decided.length) * 100) : 0;

    const resolved = myRequests.filter(r => r.resolvedAt && r.createdAt);
    const avgResolutionDays = resolved.length > 0
      ? Math.round(resolved.reduce((sum, r) => { const days = (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24); return sum + days; }, 0) / resolved.length)
      : 0;

    const priorityCounts: Record<string, number> = {};
    for (const r of myRequests) { priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1; }

    // Approval rate by type
    const approvalRateByType: { label: string; value: number; color: string }[] = [];
    for (const [type, cfg] of Object.entries(typeConfig)) {
      const typeReqs = myRequests.filter(r => r.type === type);
      const typeDecided = typeReqs.filter(r => r.status === 'approved' || r.status === 'rejected');
      const rate = typeDecided.length > 0 ? Math.round((typeReqs.filter(r => r.status === 'approved').length / typeDecided.length) * 100) : 0;
      if (typeReqs.length > 0) approvalRateByType.push({ label: cfg.label, value: rate, color: typeColorHex[type] || '#06b6d4' });
    }

    // Avg resolution time by type
    const resolutionByType: { label: string; avgDays: number; count: number; color: string }[] = [];
    for (const [type, cfg] of Object.entries(typeConfig)) {
      const typeResolved = myRequests.filter(r => r.type === type && r.resolvedAt && r.createdAt);
      const avg = typeResolved.length > 0
        ? Math.round(typeResolved.reduce((sum, r) => sum + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / typeResolved.length * 10) / 10
        : 0;
      if (myRequests.some(r => r.type === type)) resolutionByType.push({ label: cfg.label, avgDays: avg, count: typeResolved.length, color: typeColorHex[type] || '#06b6d4' });
    }

    // SLA compliance metrics
    const activeReqs = myRequests.filter(r => !['approved', 'rejected', 'cancelled'].includes(r.status));
    const slaCompliant = activeReqs.filter(r => getSlaStatus(r).status === 'on-track').length;
    const slaAtRisk = activeReqs.filter(r => getSlaStatus(r).status === 'at-risk').length;
    const slaBreached = activeReqs.filter(r => getSlaStatus(r).status === 'breached').length;
    const slaRate = activeReqs.length > 0 ? Math.round((slaCompliant / activeReqs.length) * 100) : 100;

    // Type distribution for donut
    const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
      label: typeConfig[type]?.label || type,
      value: count,
      color: typeColorHex[type] || '#64748b',
    }));

    // Priority distribution for donut
    const priorityDistribution = [
      { label: 'Low', value: priorityCounts.low || 0, color: '#94a3b8' },
      { label: 'Medium', value: priorityCounts.medium || 0, color: '#06b6d4' },
      { label: 'High', value: priorityCounts.high || 0, color: '#f59e0b' },
      { label: 'Urgent', value: priorityCounts.urgent || 0, color: '#f43f5e' },
    ];

    // Monthly volume for bar chart
    const monthlyVolume = monthlyTrend.map(m => ({ label: m.month, value: m.count, color: '#10b981' }));

    // Request trend line chart data
    const trendData = monthlyTrend.map(m => ({ label: m.month, value: m.count }));

    return {
      typeCounts, statusCounts, monthlyTrend, approvalRate, avgResolutionDays, priorityCounts,
      approvalRateByType, resolutionByType, slaRate, slaCompliant, slaAtRisk, slaBreached,
      typeDistribution, priorityDistribution, monthlyVolume, trendData,
    };
  }, [myRequests, stats.approved]);

  /* ─── Handlers ─── */
  const openNewRequest = useCallback((preType?: Request['type']) => {
    setForm({ ...emptyForm(), type: preType || 'leave' });
    setPreviewMode(false);
    setNewDialogOpen(true);
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    setSubmitting(true);
    try {
      await createRequest({ userId: user!.id, type: form.type, title: form.title.trim(), description: form.description.trim(), priority: form.priority, amount: form.amount ? parseFloat(form.amount) : undefined, dueDate: form.dueDate || undefined });
      toast.success('Request submitted successfully');
      setNewDialogOpen(false);
      setForm(emptyForm());
      removeCurrentDraft();
    } catch { toast.error('Failed to submit request'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id: string) => {
    try { await updateRequest(id, 'cancelled'); toast.success('Request cancelled'); }
    catch { toast.error('Failed to cancel request'); }
  };

  const handleEdit = (req: Request) => {
    setEditingReqId(req.id);
    setEditForm({ type: req.type, title: req.title, description: req.description, priority: req.priority, amount: req.amount?.toString() || '', dueDate: req.dueDate || '', dynamicFields: {} });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      await createRequest({ userId: user!.id, type: editForm.type, title: editForm.title.trim(), description: editForm.description.trim(), priority: editForm.priority, amount: editForm.amount ? parseFloat(editForm.amount) : undefined, dueDate: editForm.dueDate || undefined });
      await updateRequest(editingReqId!, 'cancelled', 'Updated and resubmitted');
      toast.success('Request updated and resubmitted');
      setEditDialogOpen(false);
      setEditingReqId(null);
    } catch { toast.error('Failed to update request'); }
    finally { setSubmitting(false); }
  };

  const handleResubmit = async (req: Request) => {
    setForm({ type: req.type, title: req.title, description: req.description, priority: req.priority, amount: req.amount?.toString() || '', dueDate: req.dueDate || '', dynamicFields: {} });
    setPreviewMode(false);
    setNewDialogOpen(true);
  };

  const handleEscalate = async () => {
    if (!escalatingReqId || !escalateReason.trim()) { toast.error('Reason is required'); return; }
    setSubmitting(true);
    try {
      await updateRequest(escalatingReqId, 'escalated', escalateReason.trim());
      toast.success('Request escalated successfully');
      setEscalateDialogOpen(false);
      setEscalateReason('');
      setEscalatingReqId(null);

    } catch { toast.error('Failed to escalate request'); }
    finally { setSubmitting(false); }
  };

  const openEscalateDialog = (id: string) => {
    setEscalatingReqId(id);
    setEscalateReason('');
    setEscalateUrgency('high');
    setEscalateDialogOpen(true);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, { id: Date.now().toString(), author: user?.name || 'You', text: newComment.trim(), timestamp: new Date().toISOString(), isReviewer: false }]);
    setNewComment('');
  };

  /* ─── Export CSV ─── */
  const exportCSV = () => {
    const headers = ['ID', 'Type', 'Title', 'Description', 'Status', 'Priority', 'Amount', 'Due Date', 'Department', 'Reviewer', 'Review Comment', 'Created At', 'Updated At'];
    const rows = myRequests.map(r => [
      r.id, r.type, `"${r.title.replace(/"/g, '""')}"`, `"${r.description.replace(/"/g, '""')}"`,
      r.status, r.priority, r.amount?.toString() || '', r.dueDate || '',
      r.departmentName || '', r.reviewerName || '', r.reviewComment || '',
      new Date(r.createdAt).toLocaleString(), r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported requests to CSV');
  };

  /* ─── Calendar helpers ─── */
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calMonthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calPrevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); setSelectedDay(null); };
  const calNextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); setSelectedDay(null); };

  const getRequestsForDay = (day: number) => calendarRequests.filter(r => { const date = r.dueDate || r.createdAt; return new Date(date).getDate() === day; });

  const firstName = user?.name?.split(' ')[0] || 'there';

  const openDetail = useCallback((req: Request) => {
    setSelectedRequestId(req.id);
    setActiveView('request-detail');
  }, [setSelectedRequestId, setActiveView]);

  const toggleTableSort = (key: string) => {
    if (tableSortKey === key) setTableSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setTableSortKey(key); setTableSortDir('asc'); }
  };

  /* ─── Field Completion Progress ─── */
  const fieldCompletion = useMemo(() => {
    const required: Array<{ key: string; filled: boolean }> = [];
    required.push({ key: 'type', filled: !!form.type });
    required.push({ key: 'title', filled: form.title.trim().length > 0 });
    required.push({ key: 'description', filled: form.description.trim().length > 0 });
    required.push({ key: 'priority', filled: !!form.priority });
    // Type-specific required fields
    if (form.type === 'expense') {
      required.push({ key: 'amount', filled: !!form.amount });
      required.push({ key: 'category', filled: !!form.dynamicFields.category });
    } else if (form.type === 'travel') {
      required.push({ key: 'destination', filled: !!form.dynamicFields.destination });
      required.push({ key: 'travelStart', filled: !!form.dynamicFields.travelStart });
      required.push({ key: 'travelEnd', filled: !!form.dynamicFields.travelEnd });
    } else if (form.type === 'leave') {
      required.push({ key: 'startDate', filled: !!form.dynamicFields.startDate });
      required.push({ key: 'endDate', filled: !!form.dynamicFields.endDate });
      required.push({ key: 'leaveType', filled: !!form.dynamicFields.leaveType });
    } else if (form.type === 'asset') {
      required.push({ key: 'assetType', filled: !!form.dynamicFields.assetType });
    } else if (form.type === 'training') {
      required.push({ key: 'course', filled: !!form.dynamicFields.course });
    } else if (form.type === 'equipment') {
      required.push({ key: 'equipType', filled: !!form.dynamicFields.equipType });
    }
    const filledCount = required.filter(f => f.filled).length;
    return { filled: filledCount, total: required.length, items: required };
  }, [form]);

  /* ─── Approval Prediction ─── */
  const fetchApprovalPrediction = useCallback(async (type: Request['type'], priority: Request['priority'], amount?: string) => {
    const cacheKey = `${type}-${priority}-${amount || '0'}`;
    if (predictionCache.current[cacheKey]) {
      setApprovalPrediction(predictionCache.current[cacheKey]);
      return;
    }
    setPredictionLoading(true);
    try {
      const params = new URLSearchParams({ type, priority });
      if (amount) params.set('amount', amount);
      const res = await fetch(`/api/request-approval-prediction?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const prediction = { rate: data.approvalRate ?? data.rate ?? 50, totalSimilar: data.totalSimilar ?? 0, tip: data.tip ?? '' };
        predictionCache.current[cacheKey] = prediction;
        setApprovalPrediction(prediction);
      }
    } catch {
      // Silently fail — prediction is optional
    } finally {
      setPredictionLoading(false);
    }
  }, []);

  // Debounced prediction trigger when type or priority changes
  useEffect(() => {
    if (!form.type || !form.priority) return;
    if (predictionDebounceRef.current) clearTimeout(predictionDebounceRef.current);
    predictionDebounceRef.current = setTimeout(() => {
      fetchApprovalPrediction(form.type, form.priority, form.amount);
    }, 300);
    return () => { if (predictionDebounceRef.current) clearTimeout(predictionDebounceRef.current); };
  }, [form.type, form.priority, form.amount, fetchApprovalPrediction]);

  /* ─── Drafts ─── */
  const loadDrafts = useCallback(() => {
    try {
      const raw = localStorage.getItem('ems-request-drafts');
      if (raw) setDrafts(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveDraft = useCallback((formState: FormState) => {
    try {
      const raw = localStorage.getItem('ems-request-drafts');
      const existing: Array<{ id: string; form: FormState; savedAt: string }> = raw ? JSON.parse(raw) : [];
      const id = currentDraftIdRef.current || Date.now().toString();
      const idx = existing.findIndex(d => d.id === id);
      const draft = { id, form: { ...formState }, savedAt: new Date().toISOString() };
      if (idx >= 0) existing[idx] = draft; else existing.unshift(draft);
      localStorage.setItem('ems-request-drafts', JSON.stringify(existing));
      currentDraftIdRef.current = id;
      setDrafts([...existing]);
    } catch { /* ignore */ }
  }, []);

  const loadDraftIntoForm = useCallback((draft: { id: string; form: FormState; savedAt: string }) => {
    setForm({ ...draft.form });
    currentDraftIdRef.current = draft.id;
    setPreviewMode(false);
    setNewDialogOpen(true);
    setShowDrafts(false);
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    try {
      const raw = localStorage.getItem('ems-request-drafts');
      const existing: Array<{ id: string; form: FormState; savedAt: string }> = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter(d => d.id !== draftId);
      localStorage.setItem('ems-request-drafts', JSON.stringify(filtered));
      setDrafts(filtered);
      if (currentDraftIdRef.current === draftId) currentDraftIdRef.current = null;
    } catch { /* ignore */ }
  }, []);

  const removeCurrentDraft = useCallback(() => {
    if (currentDraftIdRef.current) {
      deleteDraft(currentDraftIdRef.current);
      currentDraftIdRef.current = null;
    }
  }, [deleteDraft]);

  // Load drafts on mount
  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Auto-save draft on form changes (debounced 2s)
  useEffect(() => {
    if (!newDialogOpen) return;
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      if (form.title.trim() || form.description.trim() || Object.values(form.dynamicFields).some(v => v)) {
        saveDraft(form);
        toast('Draft saved', { duration: 1500, icon: '💾' });
      }
    }, 2000);
    return () => { if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current); };
  }, [form, newDialogOpen, saveDraft]);

  /* ─── Receipt file handler ─── */
  const handleReceiptFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, receiptFile: base64, receiptFileName: file.name } }));
    };
    reader.readAsDataURL(file);
  }, []);

  /* ─── Bulk Submission ─── */
  const addBulkItem = useCallback(() => {
    setBulkItems(prev => [...prev, { id: Date.now().toString(), type: 'leave', title: '', amount: '', priority: 'medium' }]);
  }, []);

  const removeBulkItem = useCallback((id: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateBulkItem = useCallback((id: string, field: string, value: string) => {
    setBulkItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const handleBulkSubmit = async () => {
    const validItems = bulkItems.filter(item => item.title.trim());
    if (validItems.length === 0) { toast.error('Add at least one request with a title'); return; }
    setBulkSubmitting(true);
    setBulkProgress({ current: 0, total: validItems.length });
    setBulkSummary(null);
    let successCount = 0;
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      setBulkProgress({ current: i + 1, total: validItems.length });
      try {
        await createRequest({
          userId: user!.id,
          type: item.type,
          title: item.title.trim(),
          description: `Bulk submitted request`,
          priority: item.priority,
          amount: item.amount ? parseFloat(item.amount) : undefined,
        });
        successCount++;
      } catch { /* continue on error */ }
    }
    setBulkSubmitting(false);
    setBulkSummary(`${successCount} request${successCount !== 1 ? 's' : ''} submitted successfully`);
    setBulkItems([]);
    toast.success(`${successCount} request${successCount !== 1 ? 's' : ''} submitted`);
  };

  /* ─── Per-diem calculation for travel ─── */
  const travelPerDiem = useMemo(() => {
    const dest = (form.dynamicFields.destination || '').toLowerCase();
    const start = form.dynamicFields.travelStart;
    const end = form.dynamicFields.travelEnd;
    if (!start || !end) return null;
    const days = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
    // Simplified per-diem rates by destination region
    let dailyRate = 75; // default
    if (/tokyo|japan|london|uk|singapore|switzerland|zurich/i.test(dest)) dailyRate = 200;
    else if (/new york|san francisco|los angeles|paris|france|sydney|australia/i.test(dest)) dailyRate = 150;
    else if (/mumbai|india|bangkok|thailand|manila|philippines/i.test(dest)) dailyRate = 50;
    return { days, dailyRate, total: days * dailyRate };
  }, [form.dynamicFields.destination, form.dynamicFields.travelStart, form.dynamicFields.travelEnd]);

  const SortIcon = ({ col }: { col: string }) => {
    if (tableSortKey !== col) return <ChevronDown className="h-3 w-3 text-muted-foreground/40" />;
    return tableSortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-cyan-400" /> : <ChevronDown className="h-3 w-3 text-cyan-400" />;
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  if (loading) return <div className="p-4"><PageSkeleton /></div>;

  return (
    <div className="space-y-6 pb-6">
      {/* ─── ENHANCED HEADER ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Request Center</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-semibold">{firstName}</span>{' '}
            — {stats.total} request{stats.total !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <Globe className="h-3 w-3 text-cyan-400" />
            <LiveClock />
          </div>
          <div className="relative">
            <Button onClick={() => openNewRequest()} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <Plus className="h-4 w-4" /> New Request
              {drafts.length > 0 && (
                <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 border">{drafts.length}</Badge>
              )}
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-black/[0.1] dark:border-white/[0.1]" onClick={() => { setBulkItems([{ id: Date.now().toString(), type: 'leave', title: '', amount: '', priority: 'medium' }]); setBulkSummary(null); setBulkDialogOpen(true); }}>
            <Layers className="h-4 w-4" /> Bulk Submit
          </Button>
          {drafts.length > 0 && (
            <Button variant="outline" size="sm" className={cn('gap-2 border-black/[0.1] dark:border-white/[0.1]', showDrafts && 'bg-black/[0.06] dark:bg-white/[0.1]')} onClick={() => setShowDrafts(!showDrafts)}>
              <FileEdit className="h-4 w-4" /> Drafts <Badge variant="outline" className="h-5 min-w-[20px] px-1.5 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">{drafts.length}</Badge>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2 border-black/[0.1] dark:border-white/[0.1]" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" className={cn('gap-2 border-black/[0.1] dark:border-white/[0.1]', showFilters && 'bg-black/[0.06] dark:bg-white/[0.1]')} onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>
      </motion.div>

      {/* ─── SUMMARY BADGE STRIP ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 flex-wrap">
        {stats.pending > 0 && (
          <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            {stats.pending} Pending
          </Badge>
        )}
        {stats.approvedThisMonth > 0 && (
          <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
            <CheckCircle2 className="h-3 w-3" /> {stats.approvedThisMonth} Approved this month
          </Badge>
        )}
        {stats.escalated > 0 && (
          <Badge variant="outline" className="gap-1.5 bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs">
            <AlertTriangle className="h-3 w-3" /> {stats.escalated} Escalated
          </Badge>
        )}
        <Badge variant="outline" className={cn('gap-1.5 text-xs', healthScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : healthScore >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30')}>
          <Heart className="h-3 w-3" /> Health: {healthScore}%
        </Badge>
      </motion.div>

      {/* ─── STAT CARDS ROW (8 cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Requests */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="slate">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-slate-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Requests</p>
                <p className="text-2xl font-bold text-slate-400">{stats.total}</p>
                <p className="text-[10px] text-slate-400/80">All time</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.total} max={Math.max(stats.total, 1)} size={48} color="#64748b" />
                <span className="absolute text-[10px] font-bold text-slate-400">{stats.total > 0 ? Math.round((stats.total / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 2. Pending */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="amber">
            {stats.pending > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-2 ring-amber-500/20 animate-pulse" />
              </div>
            )}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-amber-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                <p className="text-[10px] text-amber-400/80">Awaiting review</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.pending} max={Math.max(stats.total, 1)} size={48} color="#f59e0b" />
                <span className="absolute text-[10px] font-bold text-amber-400">{stats.total > 0 ? Math.round((stats.pending / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 3. Under Review */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Under Review</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.underReview}</p>
                <p className="text-[10px] text-cyan-400/80">Being reviewed</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.underReview} max={Math.max(stats.total, 1)} size={48} color="#06b6d4" />
                <span className="absolute text-[10px] font-bold text-cyan-400">{stats.total > 0 ? Math.round((stats.underReview / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 4. Approved */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
                <p className="text-[10px] text-emerald-400/80">Successfully approved</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.approved} max={Math.max(stats.total, 1)} size={48} color="#10b981" />
                <span className="absolute text-[10px] font-bold text-emerald-400">{stats.total > 0 ? Math.round((stats.approved / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 5. Rejected */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="rose">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejected</p>
                <p className="text-2xl font-bold text-rose-400">{stats.rejected}</p>
                <p className="text-[10px] text-rose-400/80">Declined requests</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.rejected} max={Math.max(stats.total, 1)} size={48} color="#f43f5e" />
                <span className="absolute text-[10px] font-bold text-rose-400">{stats.total > 0 ? Math.round((stats.rejected / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 6. Escalated */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="orange">
            {stats.escalated > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-2 ring-orange-500/20 animate-pulse" />
              </div>
            )}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-orange-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Escalated</p>
                <p className="text-2xl font-bold text-orange-400">{stats.escalated}</p>
                <p className="text-[10px] text-orange-400/80">Needs attention</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.escalated} max={Math.max(stats.total, 1)} size={48} color="#f97316" />
                <span className="absolute text-[10px] font-bold text-orange-400">{stats.total > 0 ? Math.round((stats.escalated / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 7. Approval Rate */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval Rate</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.approvalRate}%</p>
                <p className="text-[10px] text-emerald-400/80">Success rate</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.approvalRate} max={100} size={48} color="#10b981" />
                <span className="absolute text-[10px] font-bold text-emerald-400">{stats.approvalRate}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 8. Avg Processing */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Processing</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.avgProcessingDays}d</p>
                <p className="text-[10px] text-cyan-400/80">Average time</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.avgProcessingDays} max={14} size={48} color="#06b6d4" />
                <span className="absolute text-[10px] font-bold text-cyan-400">{Math.round((stats.avgProcessingDays / 14) * 100)}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ─── QUICK ACTIONS GRID (8 tiles) ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Object.entries(typeConfig).map(([key, cfg], i) => {
            const Icon = cfg.icon;
            const count = myRequests.filter(r => r.type === key).length;
            return (
              <motion.div key={key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.03 }}>
                <GlassCard hover onClick={() => openNewRequest(key as Request['type'])}
                  className={cn('p-3 cursor-pointer border transition-all text-center', `bg-${cfg.color}-500/5 border-${cfg.color}-500/20 hover:border-${cfg.color}-400/40`, cfg.iconBg.replace('/20', '/5'))}>
                  <div className={cn('rounded-lg p-2 mx-auto w-fit', cfg.iconBg)}>
                    <Icon className={cn('h-5 w-5', cfg.iconText)} />
                  </div>
                  <p className="text-xs font-medium mt-2 truncate">{cfg.label}</p>
                  {count > 0 && <span className="text-[10px] text-muted-foreground mt-0.5 block">{count} active</span>}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── MAIN TAB SYSTEM ─── */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] h-auto flex-wrap">
          <TabsTrigger value="all-requests" className="gap-2 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <List className="h-3.5 w-3.5" /> All Requests
          </TabsTrigger>
          <TabsTrigger value="by-type" className="gap-2 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <LayoutGrid className="h-3.5 w-3.5" /> By Type
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══ ALL REQUESTS TAB ═══ */}
        <TabsContent value="all-requests" className="space-y-4">
          {/* Status filter tabs */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {statusFilters.map(f => {
                const count = f === 'all' ? myRequests.length : myRequests.filter(r => r.status === f).length;
                return (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border',
                      statusFilter === f ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-black/[0.02] dark:bg-white/[0.03] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.12] dark:hover:border-white/[0.2]')}>
                    {f === 'all' ? 'All' : f === 'under-review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
              {/* View toggle */}
              <div className="ml-auto flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] rounded-lg p-0.5">
                <button onClick={() => setViewMode('card')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'card' ? 'bg-emerald-600/20 text-emerald-400' : 'text-muted-foreground hover:text-white')}>
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-emerald-600/20 text-emerald-400' : 'text-muted-foreground hover:text-white')}>
                  <Columns3 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Search + Filters row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-sm" />
              </div>
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 flex-wrap">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All Types</SelectItem>{Object.entries(typeConfig).map(([k, cfg]) => <SelectItem key={k} value={k}>{cfg.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[120px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{sortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* CARD VIEW — compact 4-col grid */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((req, i) => {
                  const tcfg = typeConfig[req.type] || typeConfig['leave'];
                  const TypeIcon = tcfg.icon;
                  const sla = getSlaStatus(req);

                  // Glow color by status
                  const glowMap: Record<string, 'amber' | 'cyan' | 'emerald' | 'rose' | 'none'> = {
                    'pending': 'amber',
                    'under-review': 'cyan',
                    'approved': 'emerald',
                    'rejected': 'rose',
                    'escalated': 'rose',
                    'cancelled': 'none',
                  };
                  const glowColor = glowMap[req.status] || 'none';

                  // Decorative circle color class
                  const decCircleColor: Record<string, string> = {
                    'pending': 'bg-amber-500/5',
                    'under-review': 'bg-cyan-500/5',
                    'approved': 'bg-emerald-500/5',
                    'rejected': 'bg-rose-500/5',
                    'escalated': 'bg-rose-500/5',
                    'cancelled': 'bg-black/[0.03] dark:bg-white/[0.05]',
                  };

                  // Whether to show pulse ring overlay (escalated or overdue)
                  const isOverdue = sla.status === 'breached' && !['approved', 'rejected', 'cancelled'].includes(req.status);
                  const showPulse = req.status === 'escalated' || isOverdue;

                  return (
                    <motion.div key={req.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                      <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[160px]" hover glow={glowColor === 'none' ? undefined : glowColor} onClick={() => openDetail(req)}>
                        {/* Decorative background circle */}
                        <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8', decCircleColor[req.status] || 'bg-black/[0.03] dark:bg-white/[0.05]')} />

                        {/* Pulse ring overlay for escalated / overdue */}
                        {showPulse && (
                          <div className="absolute inset-0 rounded-xl pointer-events-none">
                            <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-rose-500/40 animate-ping" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500/40 animate-ping" style={{ animationDelay: '0.5s' }} />
                          </div>
                        )}

                        <div className="relative z-10 space-y-2">
                          {/* Icon + Type badge */}
                          <div className="flex items-center gap-2">
                            <div className={cn('rounded-lg p-1.5', tcfg.iconBg, tcfg.iconText)}>
                              <TypeIcon className="h-3.5 w-3.5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tcfg.label}</Badge>
                            {req.priority === 'urgent' && (
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider animate-pulse">Urgent</span>
                            )}
                          </div>

                          {/* Title */}
                          <p className="text-sm font-medium line-clamp-2 leading-snug">{req.title}</p>

                          {/* Status + Priority + Time */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={req.status} />
                            <span className={cn('h-2 w-2 rounded-full', priorityDot[req.priority])} title={req.priority} />
                            <span className="text-[10px] text-muted-foreground">{timeAgo(req.createdAt)}</span>
                          </div>

                          {/* Amount or due date + SLA */}
                          <div className="flex items-center justify-between gap-2">
                            {req.amount != null && req.amount > 0 ? (
                              <span className="text-xs font-semibold text-emerald-400">${req.amount.toLocaleString()}</span>
                            ) : req.dueDate ? (
                              <span className="text-[10px] text-muted-foreground">Due {formatDate(req.dueDate)}</span>
                            ) : (
                              <span />
                            )}
                            <SlaIndicator req={req} compact />
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full">
                  <GlassCard className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-black/[0.03] dark:bg-white/[0.05] p-4"><Inbox className="h-8 w-8 text-muted-foreground" /></div>
                      <p className="text-muted-foreground text-sm">{searchQuery ? 'No matching requests found' : statusFilter === 'all' ? 'No requests yet' : `No ${statusFilter.replace('-', ' ')} requests`}</p>
                      <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => openNewRequest()}><Plus className="h-4 w-4" /> Create Request</Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <GlassCard className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/[0.1] dark:border-white/[0.1]">
                      {[
                        { key: 'type', label: 'Type' },
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'priority', label: 'Priority' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'dueDate', label: 'Due Date' },
                        { key: 'createdAt', label: 'Age' },
                        { key: 'reviewer', label: 'Reviewer' },
                        { key: 'actions', label: '' },
                      ].map(col => (
                        <th key={col.key} className={cn('px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider', col.key !== 'actions' && 'cursor-pointer hover:text-white transition-colors')}
                          onClick={() => col.key !== 'actions' && toggleTableSort(col.key)}>
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.key !== 'actions' && <SortIcon col={col.key} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableSorted.map((req, i) => {
                      const cfg = typeConfig[req.type] || typeConfig['leave'];
                      const TIcon = cfg.icon;
                      const age = getRequestAge(req.createdAt);
                      return (
                        <tr key={req.id} className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer transition-colors" onClick={() => openDetail(req)}>
                          <td className="px-3 py-2.5">
                            <div className={cn('rounded p-1 w-fit', cfg.iconBg)}><TIcon className={cn('h-3.5 w-3.5', cfg.iconText)} /></div>
                          </td>
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium truncate">{req.title}</span>
                              <SlaIndicator req={req} compact />
                            </div>
                          </td>
                          <td className="px-3 py-2.5"><StatusBadge status={req.status} /></td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('h-2 w-2 rounded-full', priorityDot[req.priority])} />
                              <span className="text-xs capitalize">{req.priority}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">{req.amount ? <span className="text-emerald-400 font-medium">${req.amount.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{req.dueDate ? formatDate(req.dueDate) : '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{age}d</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[100px]">{req.reviewerName || '—'}</td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openDetail(req)}><Eye className="h-3 w-3" /></Button>
                              {req.status === 'pending' && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-400" onClick={() => handleCancel(req.id)}><XCircle className="h-3 w-3" /></Button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {tableSorted.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground text-sm">No requests found</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </GlassCard>
          )}
        </TabsContent>

        {/* ═══ BY TYPE TAB ═══ */}
        <TabsContent value="by-type" className="space-y-4">
          {Object.keys(groupedByType).length === 0 ? (
            <GlassCard className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-black/[0.03] dark:bg-white/[0.05] p-4"><LayoutGrid className="h-8 w-8 text-muted-foreground" /></div>
                <p className="text-muted-foreground text-sm">No requests to group</p>
                <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => openNewRequest()}><Plus className="h-4 w-4" /> Create Request</Button>
              </div>
            </GlassCard>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(groupedByType)} className="space-y-3">
              {Object.entries(groupedByType).map(([type, reqs]) => {
                const cfg = typeConfig[type] || typeConfig['leave'];
                const Icon = cfg.icon;
                const approved = reqs.filter(r => r.status === 'approved').length;
                const rejected = reqs.filter(r => r.status === 'rejected').length;
                const pending = reqs.filter(r => r.status === 'pending' || r.status === 'under-review').length;
                return (
                  <AccordionItem key={type} value={type} className="border-none">
                    <AccordionTrigger className="hover:no-underline py-0">
                      <GlassCard className="p-4 w-full" hover glow={cfg.color as any}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={cn('rounded-lg p-2', cfg.iconBg)}><Icon className={cn('h-5 w-5', cfg.iconText)} /></div>
                            <div className="text-left">
                              <span className="font-semibold text-sm">{cfg.label} Requests</span>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-emerald-400">{approved} approved</span>
                                <span className="text-[10px] text-rose-400">{rejected} rejected</span>
                                <span className="text-[10px] text-amber-400">{pending} pending</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn('text-xs', cfg.iconBg, cfg.iconText)}>{reqs.length}</Badge>
                        </div>
                      </GlassCard>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-2">
                      {reqs.map(req => (
                        <GlassCard key={req.id} hover onClick={() => openDetail(req)} className="p-3 ml-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{req.title}</span>
                                <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDot[req.priority])} />
                                <SlaIndicator req={req} compact />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <StatusBadge status={req.status} />
                                {req.amount != null && req.amount > 0 && <span className="text-xs text-emerald-400">${req.amount.toLocaleString()}</span>}
                                <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                              </div>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </GlassCard>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        {/* ═══ CALENDAR TAB ═══ */}
        <TabsContent value="calendar" className="space-y-4">
          <GlassCard className="p-4 sm:p-6" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={calPrevMonth} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <h3 className="font-semibold text-lg">{calMonthName}</h3>
              <Button variant="ghost" size="sm" onClick={calNextMonth} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: calFirstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="h-10 sm:h-12" />)}
              {Array.from({ length: calDaysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayReqs = getRequestsForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth && new Date().getFullYear() === calYear;
                const isSelected = selectedDay === day;
                return (
                  <button key={day} onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={cn('h-10 sm:h-12 rounded-lg text-xs font-medium transition-all relative border border-transparent', 'hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:border-black/[0.1] dark:hover:border-white/[0.1]', isToday && 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', isSelected && 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', !isToday && !isSelected && 'text-muted-foreground')}>
                    <span>{day}</span>
                    {dayReqs.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayReqs.slice(0, 3).map((r, ri) => <span key={ri} className={cn('h-1.5 w-1.5 rounded-full', typeColors[r.type] || 'bg-slate-400')} />)}
                        {dayReqs.length > 3 && <span className="text-[8px] text-muted-foreground ml-0.5">+{dayReqs.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
              {Object.entries(typeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', typeColors[key])} /><span className="text-[10px] text-muted-foreground">{cfg.label}</span></div>
              ))}
            </div>
          </GlassCard>

          {selectedDay !== null && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Requests on {new Date(calYear, calMonth, selectedDay).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
              {requestsForDay.length === 0 ? (
                <GlassCard className="p-6 text-center"><p className="text-sm text-muted-foreground">No requests on this day</p></GlassCard>
              ) : (
                <div className="space-y-2">
                  {requestsForDay.map(req => {
                    const cfg = typeConfig[req.type] || typeConfig['leave'];
                    const CIcon = cfg.icon;
                    return (
                      <GlassCard key={req.id} hover onClick={() => openDetail(req)} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('rounded-lg p-1.5', cfg.iconBg)}><CIcon className={cn('h-4 w-4', cfg.iconText)} /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{req.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StatusBadge status={req.status} />
                              <span className="text-xs text-muted-foreground">{req.dueDate ? 'Due: ' + formatDate(req.dueDate) : 'Created: ' + timeAgo(req.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </TabsContent>

        {/* ═══ ENHANCED ANALYTICS TAB ═══ */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Top metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <GlassCard className="p-5 text-center" glow="emerald">
                <div className="mx-auto w-20 h-20 rounded-full border-4 border-emerald-500/30 flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${analytics.approvalRate * 2.26} 226`} strokeLinecap="round" className="transition-all duration-700" />
                  </svg>
                  <span className="text-2xl font-bold text-emerald-400">{analytics.approvalRate}%</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-3 uppercase tracking-wider">Approval Rate</p>
              </GlassCard>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
              <GlassCard className="p-5 text-center" glow="cyan">
                <div className="text-4xl font-bold text-cyan-400">{analytics.avgResolutionDays}</div>
                <p className="text-xs text-muted-foreground mt-1">days avg</p>
                <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wider">Resolution Time</p>
              </GlassCard>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-5 text-center" glow="amber">
                <div className="text-4xl font-bold text-amber-400">{analytics.slaRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">SLA compliance</p>
                <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wider">SLA Score</p>
              </GlassCard>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-5 text-center" glow="rose">
                <div className="text-4xl font-bold text-rose-400">{stats.escalated}</div>
                <p className="text-xs text-muted-foreground mt-1">escalated</p>
                <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wider">Escalations</p>
              </GlassCard>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* SVG Donut: Request Type Distribution */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-5" glow="cyan">
                <h4 className="text-sm font-semibold mb-4">Request Type Distribution</h4>
                <div className="flex items-center gap-6">
                  <DonutChart data={analytics.typeDistribution} size={120} strokeWidth={10} />
                  <div className="space-y-2 flex-1">
                    {analytics.typeDistribution.map(d => (
                      <div key={d.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-xs text-muted-foreground">{d.label}</span></div>
                        <span className="text-xs font-medium">{d.value}</span>
                      </div>
                    ))}
                    {analytics.typeDistribution.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* SVG Donut: Priority Breakdown */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-5" glow="amber">
                <h4 className="text-sm font-semibold mb-4">Priority Breakdown</h4>
                <div className="flex items-center gap-6">
                  <DonutChart data={analytics.priorityDistribution} size={120} strokeWidth={10} />
                  <div className="space-y-2 flex-1">
                    {analytics.priorityDistribution.map(d => (
                      <div key={d.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-xs text-muted-foreground">{d.label}</span></div>
                        <span className="text-xs font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* SVG Bar Chart: Monthly Request Volume */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-5" glow="emerald">
                <h4 className="text-sm font-semibold mb-4">Monthly Volume (Last 6 Months)</h4>
                <BarChart data={analytics.monthlyVolume} height={140} />
              </GlassCard>
            </motion.div>

            {/* SVG Line Chart: Request Trend */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <GlassCard className="p-5" glow="cyan">
                <h4 className="text-sm font-semibold mb-4">Request Trend</h4>
                <LineChart data={analytics.trendData} height={120} />
                <div className="flex justify-between mt-2">
                  {analytics.trendData.map((d, i) => <span key={i} className="text-[10px] text-muted-foreground">{d.label}</span>)}
                </div>
              </GlassCard>
            </motion.div>

            {/* SVG Horizontal Bar: Approval Rate by Type */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-5" glow="emerald">
                <h4 className="text-sm font-semibold mb-4">Approval Rate by Type</h4>
                {analytics.approvalRateByType.length > 0 ? (
                  <HorizontalBarChart data={analytics.approvalRateByType} />
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                )}
              </GlassCard>
            </motion.div>

            {/* Avg Resolution Time by Type (Table) */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <GlassCard className="p-5" glow="cyan">
                <h4 className="text-sm font-semibold mb-4">Avg Resolution Time by Type</h4>
                {analytics.resolutionByType.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                      <span>Type</span><span className="text-center">Avg Days</span><span className="text-right">Resolved</span>
                    </div>
                    {analytics.resolutionByType.map((r, i) => (
                      <div key={i} className="grid grid-cols-3 items-center py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-xs">{r.label}</span>
                        </div>
                        <span className="text-xs font-medium text-center">{r.avgDays > 0 ? `${r.avgDays}d` : '—'}</span>
                        <span className="text-xs text-muted-foreground text-right">{r.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No resolved requests yet</p>
                )}
              </GlassCard>
            </motion.div>

            {/* SLA Compliance Metrics */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
              <GlassCard className="p-5" glow="amber">
                <h4 className="text-sm font-semibold mb-4">SLA Compliance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg p-3 bg-emerald-500/10 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{analytics.slaCompliant}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">On Track</p>
                  </div>
                  <div className="rounded-lg p-3 bg-amber-500/10 text-center">
                    <div className="text-2xl font-bold text-amber-400">{analytics.slaAtRisk}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">At Risk</p>
                  </div>
                  <div className="rounded-lg p-3 bg-rose-500/10 text-center">
                    <div className="text-2xl font-bold text-rose-400">{analytics.slaBreached}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Breached</p>
                  </div>
                  <div className="rounded-lg p-3 bg-cyan-500/10 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{analytics.slaRate}%</div>
                    <p className="text-[10px] text-muted-foreground mt-1">SLA Rate</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
                  <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">SLA Thresholds by Priority</h5>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { priority: 'Urgent', days: 1, color: 'bg-rose-500/10 text-rose-400' },
                      { priority: 'High', days: 3, color: 'bg-amber-500/10 text-amber-400' },
                      { priority: 'Medium', days: 7, color: 'bg-cyan-500/10 text-cyan-400' },
                      { priority: 'Low', days: 14, color: 'bg-slate-500/10 text-slate-400' },
                    ].map(t => (
                      <div key={t.priority} className={cn('rounded-lg p-2 text-center', t.color)}>
                        <p className="text-xs font-medium">{t.priority}</p>
                        <p className="text-[10px]">{t.days} day{t.days !== 1 ? 's' : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════
          DRAFTS PANEL
          ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDrafts && drafts.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-amber-400" /> Saved Drafts
                </h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setShowDrafts(false)}>
                  <X className="h-3.5 w-3.5" /> Close
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {drafts.map(draft => {
                  const cfg = typeConfig[draft.form.type] || typeConfig['leave'];
                  const DIcon = cfg.icon;
                  const savedAgo = timeAgo(draft.savedAt);
                  return (
                    <GlassCard key={draft.id} className="p-3 hover:border-amber-500/30 transition-all" hover>
                      <div className="flex items-start gap-3">
                        <div className={cn('rounded-lg p-1.5 shrink-0', cfg.iconBg)}>
                          <DIcon className={cn('h-4 w-4', cfg.iconText)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{draft.form.title || 'Untitled Draft'}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.label} · Saved {savedAgo}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => loadDraftIntoForm(draft)}>
                              <Copy className="h-3 w-3" /> Continue
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-rose-400 hover:bg-rose-500/10" onClick={() => deleteDraft(draft.id)}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          BULK SUBMIT DIALOG
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-emerald-400" /> Bulk Submit Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {bulkSummary ? (
              <div className="text-center py-8">
                <div className="rounded-full bg-emerald-500/10 w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-lg font-semibold text-emerald-400">{bulkSummary}</p>
                <Button className="mt-4" onClick={() => { setBulkSummary(null); setBulkDialogOpen(false); }}>Done</Button>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] p-3">
                  <p className="text-xs text-muted-foreground">Create multiple requests at once. Each row becomes a separate request. Fill in at least the title for each row.</p>
                </div>
                {bulkSubmitting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Submitting {bulkProgress.current}/{bulkProgress.total}...</span>
                      <span className="text-cyan-400 font-medium">{Math.round((bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100}%` }}
                        className="h-full rounded-full bg-cyan-500"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {bulkItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]">
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 text-center">{idx + 1}</span>
                      <Select value={item.type} onValueChange={v => updateBulkItem(item.id, 'type', v)} disabled={bulkSubmitting}>
                        <SelectTrigger className="w-[120px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(typeConfig).map(([k, cfg]) => (
                            <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input value={item.title} onChange={e => updateBulkItem(item.id, 'title', e.target.value)} placeholder="Title" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs flex-1" disabled={bulkSubmitting} />
                      <Input value={item.amount} onChange={e => updateBulkItem(item.id, 'amount', e.target.value)} placeholder="Amount" type="number" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs w-20" disabled={bulkSubmitting} />
                      <Select value={item.priority} onValueChange={v => updateBulkItem(item.id, 'priority', v)} disabled={bulkSubmitting}>
                        <SelectTrigger className="w-[90px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10 shrink-0" onClick={() => removeBulkItem(item.id)} disabled={bulkSubmitting || bulkItems.length <= 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2 border-black/[0.1] dark:border-white/[0.1] text-xs" onClick={addBulkItem} disabled={bulkSubmitting}>
                    <PlusCircle className="h-3.5 w-3.5" /> Add Row
                  </Button>
                  <span className="text-[10px] text-muted-foreground">{bulkItems.length} row{bulkItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setBulkDialogOpen(false)} disabled={bulkSubmitting}>Cancel</Button>
                  <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500" disabled={bulkSubmitting || bulkItems.filter(i => i.title.trim()).length === 0} onClick={handleBulkSubmit}>
                    {bulkSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit All ({bulkItems.filter(i => i.title.trim()).length})
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          NEW REQUEST DIALOG
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-400" /> New Request</DialogTitle>
          </DialogHeader>

          {!previewMode ? (
            <div className="space-y-4 py-2">
              {/* Field Completion Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Form Completion</span>
                  <span className={cn('text-[10px] font-semibold', fieldCompletion.filled === fieldCompletion.total ? 'text-emerald-400' : 'text-amber-400')}>
                    {fieldCompletion.filled}/{fieldCompletion.total} required fields
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(fieldCompletion.filled / Math.max(fieldCompletion.total, 1)) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    className={cn('h-full rounded-full transition-colors',
                      fieldCompletion.filled === fieldCompletion.total ? 'bg-emerald-500' :
                      fieldCompletion.filled >= fieldCompletion.total * 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                  />
                </div>
              </div>

              {/* Type Selector Grid */}
              <div className="space-y-2">
                <Label>Request Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(typeConfig).map(([key, cfg]) => (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, type: key as Request['type'] }))}
                      className={cn('flex flex-col items-center gap-1 rounded-lg p-2 border transition-all text-xs', form.type === key ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]')}>
                      <cfg.icon className="h-4 w-4" /><span className="truncate">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval Prediction Card */}
              {(form.type && form.priority) && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <GlassCard className={cn('p-3',
                    approvalPrediction && approvalPrediction.rate >= 75 ? 'border-emerald-500/30' :
                    approvalPrediction && approvalPrediction.rate >= 50 ? 'border-amber-500/30' :
                    approvalPrediction ? 'border-rose-500/30' : 'border-black/[0.1] dark:border-white/[0.1]'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center shrink-0">
                        {predictionLoading ? (
                          <div className="h-10 w-10 rounded-full border-2 border-black/[0.1] dark:border-white/[0.1] border-t-cyan-400 animate-spin" />
                        ) : (
                          <ProgressRing
                            value={approvalPrediction?.rate ?? 0}
                            max={100}
                            size={40}
                            strokeWidth={4}
                            color={
                              (approvalPrediction?.rate ?? 0) >= 75 ? '#10b981' :
                              (approvalPrediction?.rate ?? 0) >= 50 ? '#f59e0b' : '#f43f5e'
                            }
                          />
                        )}
                        <span className={cn('absolute text-[10px] font-bold',
                          (approvalPrediction?.rate ?? 0) >= 75 ? 'text-emerald-400' :
                          (approvalPrediction?.rate ?? 0) >= 50 ? 'text-amber-400' : 'text-rose-400'
                        )}>
                          {approvalPrediction ? `${approvalPrediction.rate}%` : '—'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs font-semibold',
                          (approvalPrediction?.rate ?? 0) >= 75 ? 'text-emerald-400' :
                          (approvalPrediction?.rate ?? 0) >= 50 ? 'text-amber-400' : 'text-rose-400'
                        )}>
                          {!approvalPrediction ? 'Calculating...' :
                            approvalPrediction.rate >= 75 ? `High approval chance (${approvalPrediction.rate}%)` :
                            approvalPrediction.rate >= 50 ? `Moderate approval chance (${approvalPrediction.rate}%)` :
                            `Low approval chance (${approvalPrediction.rate}%)`
                          }
                        </p>
                        {approvalPrediction && approvalPrediction.totalSimilar > 0 && (
                          <p className="text-[10px] text-muted-foreground">Based on {approvalPrediction.totalSimilar} similar requests</p>
                        )}
                        {approvalPrediction?.tip && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{approvalPrediction.tip}</p>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Request title..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              <div className="space-y-2"><Label>Description <span className="text-muted-foreground text-xs">({form.description.length}/500)</span></Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 500) }))} placeholder="Describe your request..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Request['priority'] }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">🟢 Low</SelectItem><SelectItem value="medium">🔵 Medium</SelectItem><SelectItem value="high">🟡 High</SelectItem><SelectItem value="urgent">🔴 Urgent</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              </div>

              {/* Dynamic fields per type */}
              {form.type === 'leave' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.dynamicFields.startDate || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, startDate: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.dynamicFields.endDate || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, endDate: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  <div className="space-y-2"><Label>Leave Type</Label><Select value={form.dynamicFields.leaveType || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, leaveType: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select type..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="sick">Sick</SelectItem><SelectItem value="casual">Casual</SelectItem><SelectItem value="vacation">Vacation</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Reason</Label><Input value={form.dynamicFields.reason || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, reason: e.target.value } }))} placeholder="Reason for leave..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </>
              )}
              {form.type === 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Amount</Label><div className="flex gap-1">
                      <Select value={form.dynamicFields.currency || 'USD'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, currency: v } }))}>
                        <SelectTrigger className="w-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD $</SelectItem>
                          <SelectItem value="EUR">EUR €</SelectItem>
                          <SelectItem value="GBP">GBP £</SelectItem>
                          <SelectItem value="JPY">JPY ¥</SelectItem>
                          <SelectItem value="INR">INR ₹</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] flex-1" />
                    </div></div>
                    <div className="space-y-2"><Label>Category</Label><Select value={form.dynamicFields.category || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, category: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="travel">Travel</SelectItem><SelectItem value="meals">Meals</SelectItem><SelectItem value="office">Office Supplies</SelectItem><SelectItem value="software">Software</SelectItem></SelectContent></Select></div>
                  </div>
                  {/* Receipt Upload Drop Zone */}
                  <div className="space-y-2">
                    <Label>Receipt Upload</Label>
                    <label className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-all',
                      form.dynamicFields.receiptFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] hover:border-black/[0.12] dark:hover:border-white/[0.2] hover:bg-black/[0.02] dark:hover:bg-white/[0.04]')}>
                      {form.dynamicFields.receiptFile ? (
                        <>
                          <CheckCheck className="h-5 w-5 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">{form.dynamicFields.receiptFileName || 'File attached'}</span>
                          <span className="text-[10px] text-muted-foreground">Click to replace</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Drop receipt here or click to browse</span>
                          <span className="text-[10px] text-muted-foreground/60">PDF, JPG, PNG (max 5MB)</span>
                        </>
                      )}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleReceiptFile} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Receipt #</Label><Input value={form.dynamicFields.receipt || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, receipt: e.target.value } }))} placeholder="Receipt number" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Project Code</Label><Input value={form.dynamicFields.projectCode || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, projectCode: e.target.value } }))} placeholder="e.g. PRJ-2024-001" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  {/* Recurring expense toggle */}
                  <div className="flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] p-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Recurring expense</p>
                        <p className="text-[10px] text-muted-foreground">This expense repeats monthly</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, recurring: f.dynamicFields.recurring === 'true' ? '' : 'true' } }))}
                      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        form.dynamicFields.recurring === 'true' ? 'bg-emerald-500' : 'bg-black/[0.06] dark:bg-white/[0.1]'
                      )}>
                      <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                        form.dynamicFields.recurring === 'true' ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                </>
              )}
              {form.type === 'asset' && (
                <>
                  <div className="space-y-2"><Label>Asset Type</Label><Select value={form.dynamicFields.assetType || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, assetType: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="laptop">Laptop</SelectItem><SelectItem value="monitor">Monitor</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="desk">Desk</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Justification</Label><Textarea value={form.dynamicFields.justification || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, justification: e.target.value } }))} placeholder="Why is this asset needed..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" /></div>
                  <div className="space-y-2"><Label>Urgency</Label><Select value={form.dynamicFields.urgency || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, urgency: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="immediate">Immediate</SelectItem><SelectItem value="within-week">Within a Week</SelectItem><SelectItem value="within-month">Within a Month</SelectItem></SelectContent></Select></div>
                </>
              )}
              {form.type === 'shift-swap' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Current Shift</Label><Input value={form.dynamicFields.currentShift || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, currentShift: e.target.value } }))} placeholder="e.g. 9AM-5PM" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Desired Shift</Label><Input value={form.dynamicFields.desiredShift || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, desiredShift: e.target.value } }))} placeholder="e.g. 10AM-6PM" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  <div className="space-y-2"><Label>Swap Partner</Label><Input value={form.dynamicFields.swapPartner || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, swapPartner: e.target.value } }))} placeholder="Colleague name" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  <div className="space-y-2"><Label>Reason</Label><Textarea value={form.dynamicFields.reason || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, reason: e.target.value } }))} placeholder="Reason for shift swap..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" /></div>
                </>
              )}
              {form.type === 'training' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Course Name</Label><Input value={form.dynamicFields.course || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, course: e.target.value } }))} placeholder="Course name" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Provider</Label><Input value={form.dynamicFields.provider || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, provider: e.target.value } }))} placeholder="Training provider" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Cost ($)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.dynamicFields.startDate || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, startDate: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  <div className="space-y-2"><Label>Justification</Label><Textarea value={form.dynamicFields.justification || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, justification: e.target.value } }))} placeholder="Why this training is needed..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" /></div>
                </>
              )}
              {form.type === 'equipment' && (
                <>
                  <div className="space-y-2"><Label>Equipment Type</Label><Select value={form.dynamicFields.equipType || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, equipType: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="keyboard">Keyboard</SelectItem><SelectItem value="mouse">Mouse</SelectItem><SelectItem value="headset">Headset</SelectItem><SelectItem value="chair">Chair</SelectItem><SelectItem value="standing-desk">Standing Desk</SelectItem></SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.dynamicFields.quantity || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, quantity: e.target.value } }))} placeholder="1" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  <div className="space-y-2"><Label>Justification</Label><Textarea value={form.dynamicFields.justification || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, justification: e.target.value } }))} placeholder="Why this equipment is needed..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" /></div>
                </>
              )}
              {form.type === 'travel' && (
                <>
                  <div className="space-y-2"><Label>Destination</Label><Input value={form.dynamicFields.destination || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, destination: e.target.value } }))} placeholder="City, Country" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Travel Start</Label><Input type="date" value={form.dynamicFields.travelStart || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, travelStart: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Travel End</Label><Input type="date" value={form.dynamicFields.travelEnd || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, travelEnd: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Flight Class</Label><Select value={form.dynamicFields.flightClass || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, flightClass: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="economy">✈️ Economy</SelectItem><SelectItem value="business">✈️ Business</SelectItem><SelectItem value="first">✈️ First Class</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Number of Travelers</Label><Input type="number" min="1" value={form.dynamicFields.travelers || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, travelers: e.target.value } }))} placeholder="1" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  </div>
                  {/* Hotel requirement checkbox */}
                  <div className="flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] p-3">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Hotel Required</p>
                        <p className="text-[10px] text-muted-foreground">Include accommodation in request</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, hotelRequired: f.dynamicFields.hotelRequired === 'true' ? '' : 'true' } }))}
                      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        form.dynamicFields.hotelRequired === 'true' ? 'bg-emerald-500' : 'bg-black/[0.06] dark:bg-white/[0.1]'
                      )}>
                      <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                        form.dynamicFields.hotelRequired === 'true' ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  <div className="space-y-2"><Label>Purpose</Label><Textarea value={form.dynamicFields.purpose || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, purpose: e.target.value } }))} placeholder="Purpose of travel..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" /></div>
                  <div className="space-y-2"><Label>Estimated Cost ($)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  {/* Per-diem calculation */}
                  {travelPerDiem && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3">
                        <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">Estimated Per Diem</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-cyan-400">${travelPerDiem.total.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">(${travelPerDiem.dailyRate}/day × {travelPerDiem.days} days)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              {form.type === 'it-support' && (
                <>
                  <div className="space-y-2"><Label>Issue Category</Label><Select value={form.dynamicFields.issueCat || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, issueCat: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="hardware">Hardware</SelectItem><SelectItem value="software">Software</SelectItem><SelectItem value="network">Network</SelectItem><SelectItem value="access">Access</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Device</Label><Input value={form.dynamicFields.device || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, device: e.target.value } }))} placeholder="e.g. MacBook Pro" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                    <div className="space-y-2"><Label>Urgency Level</Label><Select value={form.dynamicFields.itUrgency || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, itUrgency: v === '_none' ? '' : v } }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="_none">Select...</SelectItem><SelectItem value="blocking">Blocking Work</SelectItem><SelectItem value="degraded">Degraded Performance</SelectItem><SelectItem value="minor">Minor Issue</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Room / Location</Label><Input value={form.dynamicFields.room || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, room: e.target.value } }))} placeholder="e.g. Floor 3, Room 301" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </>
              )}

              {/* Attachment placeholder */}
              <div className="space-y-2"><Label>Attachments</Label><div className="border border-dashed border-black/[0.1] dark:border-white/[0.1] rounded-lg p-4 text-center"><Paperclip className="h-5 w-5 mx-auto text-muted-foreground mb-1" /><p className="text-xs text-muted-foreground">File attachments coming soon</p></div></div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
                <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => { saveDraft(form); toast.success('Draft saved'); }}>
                  <Save className="h-4 w-4" /> Save Draft
                </Button>
                <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => setPreviewMode(true)}><Eye className="h-4 w-4" /> Preview</Button>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-4 py-2">
              <GlassCard className="p-4" glow="emerald">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {(() => { const cfg = typeConfig[form.type]; const PIcon = cfg.icon; return (<><div className={cn('rounded-lg p-1.5', cfg.iconBg)}><PIcon className={cn('h-4 w-4', cfg.iconText)} /></div><Badge variant="outline" className="text-xs">{cfg.label}</Badge></>); })()}
                    <span className={cn('h-2 w-2 rounded-full', priorityDot[form.priority])} /><span className="text-xs capitalize text-muted-foreground">{form.priority}</span>
                  </div>
                  <h3 className="font-semibold">{form.title || 'Untitled'}</h3>
                  <p className="text-sm text-muted-foreground">{form.description || 'No description'}</p>
                  {(form.amount || form.dueDate) && (
                    <div className="flex gap-3 text-xs">
                      {form.amount && <span className="text-emerald-400 font-medium">${parseFloat(form.amount).toLocaleString()}</span>}
                      {form.dueDate && <span className="text-muted-foreground">Due: {formatDate(form.dueDate)}</span>}
                    </div>
                  )}
                  {Object.keys(form.dynamicFields).length > 0 && (
                    <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.05] space-y-1">
                      {Object.entries(form.dynamicFields).filter(([, v]) => v).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs"><span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span><span className="truncate ml-2">{val}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPreviewMode(false)}>Back to Edit</Button>
                <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" /> : <Send className="h-4 w-4" />} Submit Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          EDIT REQUEST DIALOG
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-amber-400" /> Edit Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Request Type</Label><div className="grid grid-cols-4 gap-2">{Object.entries(typeConfig).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => setEditForm(f => ({ ...f, type: key as Request['type'] }))}
                className={cn('flex flex-col items-center gap-1 rounded-lg p-2 border transition-all text-xs', editForm.type === key ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]')}>
                <cfg.icon className="h-4 w-4" /><span className="truncate">{cfg.label}</span>
              </button>
            ))}</div></div>
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Request title..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="space-y-2"><Label>Description <span className="text-muted-foreground text-xs">({editForm.description.length}/500)</span></Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value.slice(0, 500) }))} placeholder="Describe your request..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Priority</Label><Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v as Request['priority'] }))}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">🟢 Low</SelectItem><SelectItem value="medium">🔵 Medium</SelectItem><SelectItem value="high">🟡 High</SelectItem><SelectItem value="urgent">🔴 Urgent</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={editForm.dueDate} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            </div>
            {(editForm.type === 'expense' || editForm.type === 'travel' || editForm.type === 'training' || editForm.type === 'equipment') && (
              <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-2 bg-amber-600 hover:bg-amber-500" disabled={submitting} onClick={handleEditSave}>
                {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" /> : <Send className="h-4 w-4" />} Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          ESCALATE DIALOG
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /> Escalate Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3"><p className="text-xs text-amber-400">Escalating will mark this request for senior management review. Provide a clear reason for the escalation.</p></div>
            <div className="space-y-2"><Label>Reason for Escalation</Label><Textarea value={escalateReason} onChange={e => setEscalateReason(e.target.value)} placeholder="Explain why this request needs escalation..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" /></div>
            <div className="space-y-2"><Label>Urgency Level</Label><Select value={escalateUrgency} onValueChange={setEscalateUrgency}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="medium">🔵 Medium</SelectItem><SelectItem value="high">🟡 High</SelectItem><SelectItem value="urgent">🔴 Urgent</SelectItem></SelectContent></Select></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-2 bg-amber-600 hover:bg-amber-500" disabled={submitting || !escalateReason.trim()} onClick={handleEscalate}>
                {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" /> : <AlertTriangle className="h-4 w-4" />} Escalate Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
