'use client';

import { useState, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Briefcase, Users, GraduationCap, ClipboardCheck, ArrowRight,
  TrendingUp, Clock, Star, FileText, CalendarDays, UserPlus, Award,
  Target, ArrowUpRight, CheckCircle2, XCircle, AlertCircle,
  UserCheck, ArrowRightLeft, TrendingDown, Timer,
  Sparkles, BarChart3, Eye, Send, Zap,
  Info, ThumbsUp, Play,
} from 'lucide-react';
import type { HRMData, PerformanceReview, LifecycleEvent } from '@/lib/types';

// ─── Star Rating Component ──────────────────────────────────────
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

// ─── Stage Badge ────────────────────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    applied: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
    screening: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    interview: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    assessment: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    offer: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    hired: { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
    rejected: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
    draft: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
    open: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    paused: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    closed: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
    filled: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    'not-started': { bg: 'bg-slate-500/10', text: 'text-slate-400' },
    'in-progress': { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    completed: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    overdue: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
    'self-assessment': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    'manager-review': { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    calibration: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    upcoming: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    archived: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  };
  const s = map[stage] || map.applied;
  return <Badge className={`${s.bg} ${s.text} border-0 text-[10px] font-medium capitalize`}>{stage.replace('-', ' ')}</Badge>;
}

// ─── Format helpers ─────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Lifecycle icon/color helper ────────────────────────────────
function getLifecycleIcon(type: string) {
  const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
    hire: { icon: UserPlus, color: 'text-emerald-400' },
    transfer: { icon: ArrowRightLeft, color: 'text-cyan-400' },
    promotion: { icon: TrendingUp, color: 'text-amber-400' },
    resignation: { icon: TrendingDown, color: 'text-rose-400' },
    termination: { icon: XCircle, color: 'text-rose-400' },
    'contract-end': { icon: Timer, color: 'text-slate-400' },
  };
  return iconMap[type] || iconMap.hire;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────
export function HRMView() {
  const setActiveView = useEMSStore((s) => s.setActiveView);
  const [data, setData] = useState<HRMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // ─── Detail view state (Performance & Lifecycle only) ──────
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedLifecycle, setSelectedLifecycle] = useState<LifecycleEvent | null>(null);
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('ems-auth-token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/hrm', { headers });
        const json = await res.json();
        if (json.data) setData(json.data);
      } catch (e) { console.error('HRM load failed:', e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading HRM data…</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-muted-foreground">Failed to load HRM data</div>;
  }

  const { jobPostings, candidates, onboardingPlans, trainingPrograms, performanceReviews, lifecycleEvents } = data;

  // ─── METRICS ───────────────────────────────────────────────
  const openPositions = jobPostings.filter(j => j.status?.toUpperCase() === 'OPEN').length;
  const activeOnboarding = onboardingPlans.filter(o => o.status?.toUpperCase() === 'IN_PROGRESS').length;
  const activeTraining = trainingPrograms.filter(t => t.status?.toUpperCase() === 'ACTIVE').length;
  const pendingReviews = performanceReviews.filter(r => {
    const s = r.status?.toUpperCase();
    return s !== 'COMPLETED' && s !== 'NOT_STARTED';
  }).length;
  const pipelineStages = [
    { label: 'Applied', count: candidates.filter(c => c.stage?.toUpperCase() === 'APPLIED').length, color: 'bg-slate-400' },
    { label: 'Screening', count: candidates.filter(c => c.stage?.toUpperCase() === 'SCREENING').length, color: 'bg-cyan-400' },
    { label: 'Interview', count: candidates.filter(c => c.stage?.toUpperCase() === 'INTERVIEW').length, color: 'bg-amber-400' },
    { label: 'Assessment', count: candidates.filter(c => c.stage?.toUpperCase() === 'ASSESSMENT').length, color: 'bg-violet-400' },
    { label: 'Offer', count: candidates.filter(c => c.stage?.toUpperCase() === 'OFFER').length, color: 'bg-emerald-400' },
    { label: 'Hired', count: candidates.filter(c => c.stage?.toUpperCase() === 'HIRED').length, color: 'bg-emerald-300' },
  ];
  const totalCandidates = candidates.length || 1;
  const pendingLifecycles = lifecycleEvents.filter(e => e.status?.toUpperCase() === 'PENDING');

  // ─── Detail handlers ──────────────────────────────────────
  const openReviewDetail = (r: PerformanceReview) => { setSelectedReview(r); setReviewDialogOpen(true); };
  const openLifecycleDetail = (e: LifecycleEvent) => { setSelectedLifecycle(e); setLifecycleDialogOpen(true); };

  // ─── Navigation card color helper ──────────────────────────
  const navCardColors: Record<string, { iconBg: string; iconText: string; hoverBg: string; hoverBorder: string; gradient: string; badge: string }> = {
    cyan: {
      iconBg: 'bg-cyan-500/15', iconText: 'text-cyan-400',
      hoverBg: 'hover:bg-cyan-500/5', hoverBorder: 'hover:border-cyan-500/30',
      gradient: 'from-cyan-500/20 via-transparent to-transparent', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    violet: {
      iconBg: 'bg-violet-500/15', iconText: 'text-violet-400',
      hoverBg: 'hover:bg-violet-500/5', hoverBorder: 'hover:border-violet-500/30',
      gradient: 'from-violet-500/20 via-transparent to-transparent', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    },
    amber: {
      iconBg: 'bg-amber-500/15', iconText: 'text-amber-400',
      hoverBg: 'hover:bg-amber-500/5', hoverBorder: 'hover:border-amber-500/30',
      gradient: 'from-amber-500/20 via-transparent to-transparent', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    emerald: {
      iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-400',
      hoverBg: 'hover:bg-emerald-500/5', hoverBorder: 'hover:border-emerald-500/30',
      gradient: 'from-emerald-500/20 via-transparent to-transparent', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
  };

  return (
    <div className="space-y-6 pb-4">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Human Resource Management
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse" />{openPositions} Open Positions
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-xs">
              <Clock className="h-3 w-3 mr-1" />{pendingLifecycles.length} Pending Actions
            </Badge>
          </div>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-xs">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400 text-xs">Performance</TabsTrigger>
          <TabsTrigger value="lifecycle" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 text-xs">Lifecycle</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            OVERVIEW TAB — HR Command Center
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Hero StatCards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Open Positions" value={openPositions} subtitle="Active job postings" icon={Briefcase} color="cyan" hero />
            <StatCard title="Active Onboarding" value={activeOnboarding} subtitle="In progress" icon={UserPlus} color="violet" hero pulse={activeOnboarding > 0} />
            <StatCard title="Training Programs" value={activeTraining} subtitle="Currently running" icon={GraduationCap} color="amber" hero />
            <StatCard title="Pending Reviews" value={pendingReviews} subtitle="Awaiting completion" icon={ClipboardCheck} color="rose" hero pulse={pendingReviews > 0} />
          </div>

          {/* ─── Navigation Cards — Dedicated Sub-Pages ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Job Management */}
            <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
              <button
                className="w-full text-left group"
                onClick={() => setActiveView('jobs')}
              >
                <GlassCard className={`p-5 h-full ${navCardColors.cyan.hoverBg} ${navCardColors.cyan.hoverBorder} transition-all relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${navCardColors.cyan.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`rounded-xl p-2.5 ${navCardColors.cyan.iconBg}`}>
                        <Briefcase className={`h-5 w-5 ${navCardColors.cyan.iconText}`} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-cyan-400 transition-colors">Job Management</h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Create, edit and manage job postings</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${navCardColors.cyan.badge} border text-[9px]`}>{openPositions} open</Badge>
                      <Badge className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[9px]">{jobPostings?.length || 0} total</Badge>
                    </div>
                  </div>
                </GlassCard>
              </button>
            </motion.div>

            {/* Candidate Management */}
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <button
                className="w-full text-left group"
                onClick={() => setActiveView('candidates')}
              >
                <GlassCard className={`p-5 h-full ${navCardColors.emerald.hoverBg} ${navCardColors.emerald.hoverBorder} transition-all relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${navCardColors.emerald.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`rounded-xl p-2.5 ${navCardColors.emerald.iconBg}`}>
                        <Users className={`h-5 w-5 ${navCardColors.emerald.iconText}`} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-emerald-400 transition-colors">Candidate Management</h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Track applicants through the hiring pipeline</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${navCardColors.emerald.badge} border text-[9px]`}>{candidates.filter(c => c.stage?.toUpperCase() === 'INTERVIEW').length} interviewing</Badge>
                      <Badge className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[9px]">{candidates?.length || 0} total</Badge>
                    </div>
                  </div>
                </GlassCard>
              </button>
            </motion.div>

            {/* Onboarding Management */}
            <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
              <button
                className="w-full text-left group"
                onClick={() => setActiveView('onboarding')}
              >
                <GlassCard className={`p-5 h-full ${navCardColors.violet.hoverBg} ${navCardColors.violet.hoverBorder} transition-all relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${navCardColors.violet.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`rounded-xl p-2.5 ${navCardColors.violet.iconBg}`}>
                        <UserPlus className={`h-5 w-5 ${navCardColors.violet.iconText}`} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-violet-400 transition-colors">Onboarding Management</h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Manage new employee onboarding plans</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${navCardColors.violet.badge} border text-[9px]`}>{activeOnboarding} active</Badge>
                      <Badge className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[9px]">{onboardingPlans.length} total</Badge>
                    </div>
                  </div>
                </GlassCard>
              </button>
            </motion.div>

            {/* Training Management */}
            <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
              <button
                className="w-full text-left group"
                onClick={() => setActiveView('training-mgmt')}
              >
                <GlassCard className={`p-5 h-full ${navCardColors.amber.hoverBg} ${navCardColors.amber.hoverBorder} transition-all relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${navCardColors.amber.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`rounded-xl p-2.5 ${navCardColors.amber.iconBg}`}>
                        <GraduationCap className={`h-5 w-5 ${navCardColors.amber.iconText}`} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-amber-400 transition-colors">Training Management</h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Create and track training programs</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${navCardColors.amber.badge} border text-[9px]`}>{activeTraining} active</Badge>
                      <Badge className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[9px]">{trainingPrograms.length} total</Badge>
                    </div>
                  </div>
                </GlassCard>
              </button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recruitment Pipeline */}
            <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
              <GlassCard className="p-5 h-full" glow="cyan">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" />Recruitment Pipeline</h3>
                  <button className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors" onClick={() => setActiveView('candidates')}>
                    Go to Candidates <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {pipelineStages.map((stage, i) => (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{stage.label}</span>
                        <span className="text-xs font-bold">{stage.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div className={`h-full rounded-full ${stage.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(stage.count / totalCandidates) * 100}%` }}
                          transition={{ delay: i * 0.08, duration: 0.6 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Upcoming Activities */}
            <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
              <GlassCard className="p-5 h-full" glow="amber">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><CalendarDays className="h-4 w-4 text-amber-400" />Upcoming Activities</h3>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {[
                    { icon: Users, label: 'Interview — David Chen', sub: 'Senior Frontend Developer', time: 'Tomorrow 10:00 AM', color: 'text-amber-400' },
                    { icon: GraduationCap, label: 'Leadership Excellence — Session 5', sub: '8 participants enrolled', time: 'In 2 days', color: 'text-violet-400' },
                    { icon: UserPlus, label: 'DevOps Engineer Onboarding', sub: 'Starts next Monday', time: '5 days away', color: 'text-emerald-400' },
                    { icon: ClipboardCheck, label: 'Q2 Review Cycle Begins', sub: '7 employees due for review', time: 'Next week', color: 'text-rose-400' },
                    { icon: Briefcase, label: 'Marketing Specialist closes', sub: '15 applicants to review', time: 'In 3 days', color: 'text-cyan-400' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
                      <div className={`rounded-lg p-2 bg-black/[0.03] dark:bg-white/[0.05] ${a.color}`}><a.icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.label}</p>
                        <p className="text-[10px] text-muted-foreground">{a.sub}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{a.time}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Recent Lifecycle Events */}
            <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
              <GlassCard className="p-5 h-full" glow="emerald">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-400" />Recent Lifecycle Events</h3>
                  <button className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors" onClick={() => setActiveTab('lifecycle')}>
                    View All <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {lifecycleEvents.slice(0, 6).map((e) => {
                    const m = getLifecycleIcon(e.type);
                    const Icon = m.icon;
                    return (
                      <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                        onClick={() => openLifecycleDetail(e)}>
                        <div className={`rounded-lg p-2 bg-black/[0.03] dark:bg-white/[0.05] ${m.color}`}><Icon className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{e.details}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge className={`${e.status?.toUpperCase() === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : e.status?.toUpperCase() === 'APPROVED' || e.status?.toUpperCase() === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border-0 text-[9px]`}>{(e.status || '').replace(/_/g, ' ')}</Badge>
                          <span className="text-[9px] text-muted-foreground mt-1">{formatDate(e.effectiveDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Quick Actions — Compact Row */}
          <GlassCard className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><Zap className="h-4 w-4 text-amber-400" />Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Briefcase, label: 'Post Job', desc: 'Create new listing', color: 'cyan', view: 'jobs' as const },
                { icon: UserPlus, label: 'Start Onboarding', desc: 'New employee setup', color: 'violet', view: 'onboarding' as const },
                { icon: GraduationCap, label: 'Create Training', desc: 'New program', color: 'amber', view: 'training-mgmt' as const },
                { icon: UserCheck, label: 'Manage Candidates', desc: 'View pipeline', color: 'emerald', view: 'candidates' as const },
              ].map((a) => {
                const c = navCardColors[a.color];
                return (
                  <button key={a.label} className={`flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] ${c.hoverBg} ${c.hoverBorder} transition-all text-left group`}
                    onClick={() => setActiveView(a.view)}>
                    <div className={`rounded-lg p-2 ${c.iconBg} ${c.iconText}`}><a.icon className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            PERFORMANCE TAB
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          {/* Review Cycle Overview */}
          <GlassCard className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><Target className="h-4 w-4 text-rose-400" />Review Cycle Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Not Started', count: performanceReviews.filter(r => r.status?.toUpperCase() === 'NOT_STARTED').length, color: 'text-slate-400', bg: 'bg-slate-500/10' },
                { label: 'Self Assessment', count: performanceReviews.filter(r => r.status?.toUpperCase() === 'SELF_ASSESSMENT').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Manager Review', count: performanceReviews.filter(r => r.status?.toUpperCase() === 'MANAGER_REVIEW').length, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { label: 'Calibration', count: performanceReviews.filter(r => r.status?.toUpperCase() === 'CALIBRATION').length, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { label: 'Completed', count: performanceReviews.filter(r => r.status?.toUpperCase() === 'COMPLETED').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map(s => (
                <div key={s.label} className={`p-3 rounded-xl ${s.bg} border border-black/[0.06] dark:border-white/[0.05] text-center`}>
                  <p className="text-lg font-bold">{s.count}</p>
                  <p className={`text-[10px] ${s.color}`}>{s.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Reviews Table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-black/[0.06] dark:border-white/[0.05]">
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Employee</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Cycle</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Rating</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Goal</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Competency</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Reviewer</th>
                  <th className="text-left p-3 text-[10px] font-medium text-muted-foreground uppercase">Due</th>
                  <th className="text-right p-3 text-[10px] font-medium text-muted-foreground uppercase">Actions</th>
                </tr></thead>
                <tbody>
                  {performanceReviews.map((r) => (
                    <tr key={r.id} className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openReviewDetail(r)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="bg-gradient-to-br from-rose-600 to-violet-600 text-white text-[10px]">{r.userName?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'}</AvatarFallback></Avatar>
                          <div><p className="text-sm font-medium">{r.userName}</p><p className="text-[10px] text-muted-foreground">{r.userDepartment}</p></div>
                        </div>
                      </td>
                      <td className="p-3 text-xs">{r.cycleName}</td>
                      <td className="p-3"><Badge className={`${r.status?.toUpperCase() === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : r.status?.toUpperCase() === 'NOT_STARTED' ? 'bg-slate-500/10 text-slate-400' : 'bg-amber-500/10 text-amber-400'} border-0 text-[9px]`}>{(r.status || '').replace(/_/g, ' ').replace(/-/g, ' ')}</Badge></td>
                      <td className="p-3"><StarRating rating={r.rating} /></td>
                      <td className="p-3 text-xs">{r.goalScore != null ? <span className="text-emerald-400">{r.goalScore}%</span> : '—'}</td>
                      <td className="p-3 text-xs">{r.competencyScore != null ? <span className="text-cyan-400">{r.competencyScore}%</span> : '—'}</td>
                      <td className="p-3 text-xs text-muted-foreground">{r.reviewerName || '—'}</td>
                      <td className="p-3 text-[10px] text-muted-foreground">{formatDate(r.dueDate)}</td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-400 hover:text-rose-300 gap-1"
                            onClick={() => openReviewDetail(r)}>
                            <Eye className="h-3 w-3" />View
                          </Button>
                          {r.status !== 'completed' && r.status !== 'not-started' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300 gap-1"
                              onClick={() => toast.success('Reminder sent to ' + r.reviewerName)}>
                              <Send className="h-3 w-3" />Remind
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            LIFECYCLE TAB
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="lifecycle" className="space-y-4 mt-4">
          {/* Pending Approvals */}
          {pendingLifecycles.length > 0 && (
            <GlassCard className="p-5" glow="amber">
              <h3 className="font-semibold flex items-center gap-2 mb-4"><AlertCircle className="h-4 w-4 text-amber-400" />Pending Approvals</h3>
              <div className="space-y-3">
                {pendingLifecycles.map((e) => {
                  const m = getLifecycleIcon(e.type);
                  const Icon = m.icon;
                  return (
                    <div key={e.id} className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 cursor-pointer hover:bg-amber-500/10 transition-colors"
                      onClick={() => openLifecycleDetail(e)}>
                      <div className={`rounded-lg p-3 bg-amber-500/10 ${m.color}`}><Icon className="h-5 w-5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{e.userName}</p>
                        <p className="text-xs text-muted-foreground">{e.details}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {e.fromValue && <span className="text-[10px] text-rose-400">{e.fromValue}</span>}
                          {e.fromValue && e.toValue && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          {e.toValue && <span className="text-[10px] text-emerald-400">{e.toValue}</span>}
                          <span className="text-[10px] text-muted-foreground ml-auto">Effective: {formatDate(e.effectiveDate)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={ev => ev.stopPropagation()}>
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => { toast.success(`${e.type} approved for ${e.userName}`); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />Approve
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1"
                          onClick={() => { toast.error(`${e.type} rejected for ${e.userName}`); }}>
                          <XCircle className="h-3.5 w-3.5" />Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Timeline */}
          <GlassCard className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-cyan-400" />Employee Lifecycle Timeline</h3>
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-black/[0.06] dark:bg-white/[0.1]" />
              <div className="space-y-6">
                {lifecycleEvents.map((e) => {
                  const typeColors: Record<string, string> = {
                    hire: 'border-emerald-500 bg-emerald-500/20', transfer: 'border-cyan-500 bg-cyan-500/20',
                    promotion: 'border-amber-500 bg-amber-500/20', resignation: 'border-rose-500 bg-rose-500/20',
                    termination: 'border-rose-500 bg-rose-500/20', 'contract-end': 'border-slate-500 bg-slate-500/20',
                  };
                  const typeIcons: Record<string, React.ElementType> = {
                    hire: UserPlus, transfer: ArrowRightLeft, promotion: TrendingUp,
                    resignation: TrendingDown, termination: XCircle, 'contract-end': Timer,
                  };
                  const Icon = typeIcons[e.type] || UserPlus;
                  const dotColor = typeColors[e.type] || typeColors.hire;
                  return (
                    <div key={e.id} className="relative cursor-pointer" onClick={() => openLifecycleDetail(e)}>
                      <div className={`absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 ${dotColor}`} />
                      <div className="ml-2 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium capitalize">{e.type.replace('-', ' ')}</span>
                            <Badge className={`${e.status?.toUpperCase() === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : e.status?.toUpperCase() === 'COMPLETED' || e.status?.toUpperCase() === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border-0 text-[9px]`}>{(e.status || '').replace(/_/g, ' ')}</Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{formatDate(e.effectiveDate)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{e.userName} — {e.details}</p>
                        {(e.fromValue || e.toValue) && (
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            {e.fromValue && <span className="text-rose-400">{e.fromValue}</span>}
                            {e.fromValue && e.toValue && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                            {e.toValue && <span className="text-emerald-400">{e.toValue}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════
          DETAIL VIEWS — Dialogs (Performance & Lifecycle only)
          ═══════════════════════════════════════════════════════════════ */}

      {/* ─── Performance Review Detail Dialog ─── */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-rose-600 to-violet-600 text-white text-sm">
                  {selectedReview?.userName?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base">{selectedReview?.userName}</p>
                <p className="text-xs text-muted-foreground font-normal">{selectedReview?.userDepartment} · {selectedReview?.cycleName}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Performance review details</DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              {/* Status with Progression */}
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Target className="h-3.5 w-3.5 text-rose-400" />Review Stage</h4>
                <div className="flex items-center gap-1">
                  {['not-started', 'self-assessment', 'manager-review', 'calibration', 'completed'].map((s, i) => {
                    const stages = ['not-started', 'self-assessment', 'manager-review', 'calibration', 'completed'];
                    const currentIndex = stages.indexOf(selectedReview.status);
                    const isCompleted = i <= currentIndex;
                    const isCurrent = s === selectedReview.status;
                    const stageLabels = ['Not Started', 'Self-Assess', 'Manager', 'Calibration', 'Completed'];
                    return (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`flex flex-col items-center flex-1 ${isCurrent ? 'scale-110' : ''}`}>
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${isCompleted ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30' : 'bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground/40'}`}>
                            {isCompleted ? '✓' : i + 1}
                          </div>
                          <span className={`text-[7px] mt-1 ${isCurrent ? 'text-rose-400 font-bold' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>
                            {stageLabels[i]}
                          </span>
                        </div>
                        {i < stages.length - 1 && (
                          <div className={`h-px flex-1 ${i < currentIndex ? 'bg-rose-500/30' : 'bg-black/[0.03] dark:bg-white/[0.05]'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

              {/* Scores */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                  <p className="text-[10px] text-muted-foreground">Overall Rating</p>
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <StarRating rating={selectedReview.rating} size="md" />
                    <span className="text-lg font-bold text-amber-400">{selectedReview.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-[10px] text-muted-foreground">Goal Score</p>
                  {selectedReview.goalScore != null ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-emerald-400">{selectedReview.goalScore}%</p>
                      <Progress value={selectedReview.goalScore} className="h-1.5 bg-black/[0.03] dark:bg-white/[0.05] mt-1" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/40 mt-1">—</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-[10px] text-muted-foreground">Competency</p>
                  {selectedReview.competencyScore != null ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-cyan-400">{selectedReview.competencyScore}%</p>
                      <Progress value={selectedReview.competencyScore} className="h-1.5 bg-black/[0.03] dark:bg-white/[0.05] mt-1" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/40 mt-1">—</p>
                  )}
                </div>
              </div>

              {/* Reviewer & Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Reviewer</p>
                  <p className="text-sm font-medium mt-1">{selectedReview.reviewerName || 'Not assigned'}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />Due Date</p>
                  <p className="text-sm font-medium mt-1">{formatDate(selectedReview.dueDate)}</p>
                </div>
              </div>
              {selectedReview.completedAt && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Completed on {formatDate(selectedReview.completedAt)}</p>
                </div>
              )}

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

              {/* Mock Feedback */}
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />Strengths</h4>
                <div className="space-y-1.5">
                  {['Consistently delivers high-quality work ahead of deadlines', 'Strong collaboration and communication skills', 'Proactive in identifying and resolving blockers'].map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-amber-400" />Areas for Improvement</h4>
                <div className="space-y-1.5">
                  {['Could take on more leadership responsibilities in team settings', 'Time management during multi-project phases'].map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                      <ArrowUpRight className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Target className="h-3.5 w-3.5 text-cyan-400" />Goals for Next Cycle</h4>
                <div className="space-y-1.5">
                  {['Lead at least one cross-functional initiative', 'Complete advanced certification in core domain', 'Improve project estimation accuracy by 20%'].map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-cyan-500/5 border border-cyan-500/10">
                      <Target className="h-3 w-3 text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <DialogFooter className="flex-row gap-2 sm:gap-2">
                {selectedReview.status !== 'completed' && selectedReview.status !== 'not-started' && (
                  <>
                    <Button variant="outline" className="flex-1 border-black/[0.1] dark:border-white/[0.1] gap-1"
                      onClick={() => { toast.success('Reminder sent to ' + selectedReview.reviewerName); }}>
                      <Send className="h-4 w-4" />Send Reminder
                    </Button>
                    <Button className="flex-1 bg-gradient-to-r from-rose-600 to-violet-600 text-white gap-1"
                      onClick={() => { toast.success('Review stage advanced'); setReviewDialogOpen(false); }}>
                      <ArrowRight className="h-4 w-4" />Advance Stage
                    </Button>
                  </>
                )}
                {selectedReview.status === 'not-started' && (
                  <Button className="flex-1 bg-gradient-to-r from-rose-600 to-violet-600 text-white gap-1"
                    onClick={() => { toast.success('Review started'); setReviewDialogOpen(false); }}>
                    <Play className="h-4 w-4" />Start Review
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Lifecycle Event Detail Dialog ─── */}
      <Dialog open={lifecycleDialogOpen} onOpenChange={setLifecycleDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedLifecycle && (() => {
                const m = getLifecycleIcon(selectedLifecycle.type);
                const Icon = m.icon;
                return (
                  <div className={`rounded-lg p-2.5 bg-black/[0.03] dark:bg-white/[0.05] ${m.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                );
              })()}
              <div>
                <p className="text-base capitalize">{selectedLifecycle?.type.replace('-', ' ')}</p>
                <p className="text-xs text-muted-foreground font-normal">{selectedLifecycle?.userName} · {selectedLifecycle?.userDepartment}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Lifecycle event details</DialogDescription>
          </DialogHeader>
          {selectedLifecycle && (
            <div className="space-y-4">
              {/* Status & Date */}
              <div className="flex items-center justify-between">
                <StageBadge stage={selectedLifecycle.status} />
                <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Effective: {formatDate(selectedLifecycle.effectiveDate)}</span>
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

              {/* From → To Values */}
              {(selectedLifecycle.fromValue || selectedLifecycle.toValue) && (
                <div className="p-4 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <div className="flex items-center gap-4 justify-center">
                    {selectedLifecycle.fromValue && (
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">From</p>
                        <p className="text-sm font-medium text-rose-400">{selectedLifecycle.fromValue}</p>
                      </div>
                    )}
                    {selectedLifecycle.fromValue && selectedLifecycle.toValue && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    {selectedLifecycle.toValue && (
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">To</p>
                        <p className="text-sm font-medium text-emerald-400">{selectedLifecycle.toValue}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" />Details</p>
                <p className="text-sm mt-1">{selectedLifecycle.details}</p>
              </div>

              {/* Approval Info */}
              {(selectedLifecycle.approvedByName || selectedLifecycle.approvedAt) && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Approved</p>
                  {selectedLifecycle.approvedByName && (
                    <p className="text-xs mt-1">By: {selectedLifecycle.approvedByName}</p>
                  )}
                  {selectedLifecycle.approvedAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">At: {formatDate(selectedLifecycle.approvedAt)}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex-row gap-2 sm:gap-2">
                {selectedLifecycle.status?.toUpperCase() === 'PENDING' && (
                  <>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => { toast.success(`${selectedLifecycle.type} approved for ${selectedLifecycle.userName}`); setLifecycleDialogOpen(false); }}>
                      <CheckCircle2 className="h-4 w-4" />Approve
                    </Button>
                    <Button variant="outline" className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1"
                      onClick={() => { toast.error(`${selectedLifecycle.type} rejected for ${selectedLifecycle.userName}`); setLifecycleDialogOpen(false); }}>
                      <XCircle className="h-4 w-4" />Reject
                    </Button>
                  </>
                )}
                <Button variant="outline" className="border-black/[0.1] dark:border-white/[0.1] gap-1"
                  onClick={() => { toast.info('Would navigate to employee profile'); setLifecycleDialogOpen(false); }}>
                  <Users className="h-4 w-4" />View Employee
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
