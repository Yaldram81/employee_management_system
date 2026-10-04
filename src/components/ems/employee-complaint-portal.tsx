'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import type { Complaint } from '@/lib/types';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Users, Monitor, Building, DollarSign, Briefcase, Shield,
  MessageSquare, HelpCircle, Plus, FileText, Eye, XCircle,
  Clock, AlertTriangle, CheckCircle2, Zap, Search,
  UserX, ShieldCheck, Activity, Loader2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { priorityDot, priorityLabel, timeAgo } from './shared';

/* ────────────── Config Maps ────────────── */

const categoryConfig: Record<string, { icon: LucideIcon; color: string; label: string; iconBg: string; iconText: string }> = {
  hr: { icon: Users, color: 'emerald', label: 'HR', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400' },
  it: { icon: Monitor, color: 'cyan', label: 'IT', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400' },
  facilities: { icon: Building, color: 'amber', label: 'Facilities', iconBg: 'bg-amber-500/20', iconText: 'text-amber-400' },
  finance: { icon: DollarSign, color: 'orange', label: 'Finance', iconBg: 'bg-orange-500/20', iconText: 'text-orange-400' },
  management: { icon: Briefcase, color: 'violet', label: 'Management', iconBg: 'bg-violet-500/20', iconText: 'text-violet-400' },
  security: { icon: Shield, color: 'rose', label: 'Security', iconBg: 'bg-rose-500/20', iconText: 'text-rose-400' },
  general: { icon: MessageSquare, color: 'slate', label: 'General', iconBg: 'bg-slate-500/20', iconText: 'text-slate-400' },
  other: { icon: HelpCircle, color: 'teal', label: 'Other', iconBg: 'bg-teal-500/20', iconText: 'text-teal-400' },
};

const severityLabel: Record<string, string> = {
  normal: 'Normal',
  sensitive: 'Sensitive',
  critical: 'Critical',
};

const severityColor: Record<string, string> = {
  normal: 'bg-slate-500/20 text-slate-400',
  sensitive: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-rose-500/20 text-rose-400',
};

/* ────────────── Helpers ────────────── */

const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
  }),
};

/* ────────────── Quick Templates ────────────── */

const quickTemplates = [
  { key: 'hr', label: 'HR Issue', desc: 'Workplace or policy concerns', icon: Users, category: 'hr' as const, priority: 'medium' as const, severity: 'normal' as const },
  { key: 'it', label: 'IT Problem', desc: 'Tech support & access issues', icon: Monitor, category: 'it' as const, priority: 'high' as const, severity: 'normal' as const },
  { key: 'facilities', label: 'Facilities', desc: 'Office environment issues', icon: Building, category: 'facilities' as const, priority: 'medium' as const, severity: 'normal' as const },
  { key: 'security', label: 'Security Concern', desc: 'Urgent safety matters', icon: Shield, category: 'security' as const, priority: 'critical' as const, severity: 'critical' as const },
];

/* ────────────── Main Component ────────────── */

export function EmployeeComplaintPortal() {
  const { user, complaints, createComplaint, updateComplaint } = useEMSStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: '' as string,
    priority: 'medium' as string,
    severity: 'normal' as string,
    isAnonymous: false,
  });

  // Employee sees only their own complaints
  const myComplaints = useMemo(
    () => complaints.filter((c) => c.userId === user?.id),
    [complaints, user?.id]
  );

  // Stats
  const stats = useMemo(() => ({
    total: myComplaints.length,
    open: myComplaints.filter((c) => c.status === 'open').length,
    inProgress: myComplaints.filter((c) => c.status === 'in-progress' || c.status === 'investigating').length,
    resolved: myComplaints.filter((c) => c.status === 'resolved').length,
    escalated: myComplaints.filter((c) => c.status === 'escalated').length,
  }), [myComplaints]);

  // Filtered list
  const filtered = useMemo(() => {
    if (activeTab === 'all') return myComplaints;
    return myComplaints.filter((c) => c.status === activeTab);
  }, [myComplaints, activeTab]);

  // Submit handler
  const handleSubmit = async () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.category) { toast.error('Please select a category'); return; }
    setSubmitting(true);
    try {
      await createComplaint({
        userId: user!.id,
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category as Complaint['category'],
        priority: form.priority as Complaint['priority'],
        severity: form.severity as Complaint['severity'],
        isAnonymous: form.isAnonymous,
      });
      toast.success('Complaint submitted successfully');
      setDialogOpen(false);
      setForm({ subject: '', description: '', category: '', priority: 'medium', severity: 'normal', isAnonymous: false });
    } catch {
      toast.error('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  // Withdraw handler
  const handleWithdraw = async (id: string) => {
    try {
      await updateComplaint(id, { status: 'closed', closedAt: new Date().toISOString() });
      toast.success('Complaint withdrawn');
      setDetailSheet(null);
    } catch {
      toast.error('Failed to withdraw complaint');
    }
  };

  // Template pre-fill
  const applyTemplate = (t: typeof quickTemplates[number]) => {
    setForm((f) => ({ ...f, category: t.category, priority: t.priority, severity: t.severity }));
    setDialogOpen(true);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              My Complaints
              <span className="ml-2 text-base font-normal text-muted-foreground">Hi, {firstName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              You have <span className="text-cyan-400 font-medium">{stats.total}</span> complaint{stats.total !== 1 ? 's' : ''} on record
            </p>
          </div>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 shrink-0" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> File Complaint
          </Button>
        </div>
      </motion.div>

      {/* ── Quick Stats — 4 key cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Complaints</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.total}</p>
                <p className="text-[10px] text-cyan-400/80">All time</p>
              </div>
              <div className="rounded-xl p-3 bg-cyan-500/10 text-cyan-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-cyan-400 font-semibold">{stats.open}</span> open</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-amber-400 font-semibold">{stats.inProgress}</span> in progress</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
                <p className="text-[10px] text-emerald-400/80">{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% resolution rate</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10 text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground">Successfully resolved</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="rose">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-rose-500/5" />
            {stats.escalated > 0 && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-400 animate-pulse z-10" />}
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Escalated</p>
                <p className="text-2xl font-bold text-rose-400">{stats.escalated}</p>
                <p className="text-[10px] text-rose-400/80">Needs attention</p>
              </div>
              <div className="rounded-xl p-3 bg-rose-500/10 text-rose-400 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground">Under investigation</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="amber">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-amber-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
                <p className="text-[10px] text-amber-400/80">Being worked on</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10 text-amber-400 shrink-0">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground">Active investigations</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Quick Templates ── */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Start Templates</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickTemplates.map((t) => {
            const Icon = t.icon;
            const cfg = categoryConfig[t.category];
            return (
              <motion.div key={t.key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <GlassCard hover onClick={() => applyTemplate(t)} className="p-4 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${cfg.iconBg} ${cfg.iconText}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 h-auto flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'investigating', label: 'Investigating' },
            { value: 'in-progress', label: 'In Progress' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <GlassCard className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full p-4 bg-white/5">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No complaints here</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs">
                      {activeTab === 'all'
                        ? 'You haven\'t filed any complaints yet. Use a template above or click File Complaint to get started.'
                        : `No ${activeTab.replace('-', ' ')} complaints found. They'll appear here when the status changes.`}
                    </p>
                    <Button size="sm" variant="outline" className="mt-2 gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setDialogOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> File New Complaint
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c, i) => {
                  const cfg = categoryConfig[c.category] || categoryConfig.other;
                  const CatIcon = cfg.icon;
                  return (
                    <motion.div
                      key={c.id}
                      custom={i}
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      layout
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <GlassCard hover className="p-4" onClick={() => setDetailSheet(c)}>
                        <div className="flex items-start gap-3">
                          {/* Category icon */}
                          <div className={`rounded-lg p-2 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}>
                            <CatIcon className="h-4 w-4" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Row 1: Subject + badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate max-w-[200px] sm:max-w-none">{c.subject}</span>
                              <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[c.priority] || 'bg-slate-400'}`} title={priorityLabel[c.priority] || c.priority} />
                              <Badge variant="outline" className={`text-[10px] ${cfg.iconBg} ${cfg.iconText} border-0`}>{cfg.label}</Badge>
                              {c.isAnonymous && (
                                <Badge variant="outline" className="text-[10px] bg-slate-500/20 text-slate-400 border-slate-500/30 gap-1">
                                  <UserX className="h-2.5 w-2.5" /> Anon
                                </Badge>
                              )}
                            </div>

                            {/* Row 2: Description preview */}
                            <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>

                            {/* Row 3: Meta */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <StatusBadge status={c.status === 'open' ? 'open' : c.status === 'escalated' ? 'urgent' : c.status} />
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(c.createdAt)}</span>
                              {c.assigneeName && (
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.assigneeName}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-cyan-400" onClick={(e) => { e.stopPropagation(); setDetailSheet(c); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {c.status === 'open' && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400" onClick={(e) => { e.stopPropagation(); handleWithdraw(c.id); }}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* ── File Complaint Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-white/20 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" /> File a Complaint
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Category Selector Grid */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(categoryConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const selected = form.category === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: key }))}
                      className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all text-center ${
                        selected
                          ? `${cfg.iconBg} ${cfg.iconText} border-current`
                          : 'border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief subject of your complaint..."
                className="bg-white/5 border-white/10"
              />
            </div>

            {/* Description with char count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <span className="text-xs text-muted-foreground">{form.description.length}/2000</span>
              </div>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                placeholder="Describe your complaint in detail..."
                className="bg-white/5 border-white/10 min-h-[120px]"
              />
            </div>

            {/* Priority & Severity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" /> Low</span></SelectItem>
                    <SelectItem value="medium"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Medium</span></SelectItem>
                    <SelectItem value="high"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> High</span></SelectItem>
                    <SelectItem value="critical"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" /> Critical</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="sensitive">Sensitive</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Anonymous Toggle */}
            <GlassCard className="p-4" glow={form.isAnonymous ? 'cyan' : 'none'}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`h-5 w-5 ${form.isAnonymous ? 'text-cyan-400' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">Submit Anonymously</p>
                    <p className="text-xs text-muted-foreground">Your identity will be hidden from all viewers</p>
                  </div>
                </div>
                <Switch
                  checked={form.isAnonymous}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isAnonymous: v }))}
                />
              </div>
              {form.isAnonymous && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-start gap-2 text-xs text-cyan-400/80">
                    <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Your name, email, and department will be concealed. Only authorized investigators may access your identity under strict protocols.</span>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Complaint Detail Sheet ── */}
      <Sheet open={!!detailSheet} onOpenChange={(open) => { if (!open) setDetailSheet(null); }}>
        <SheetContent className="glass-strong border-white/20 sm:max-w-lg overflow-y-auto">
          {detailSheet && (() => {
            const c = detailSheet;
            const cfg = categoryConfig[c.category] || categoryConfig.other;
            const CatIcon = cfg.icon;

            // Build timeline
            const timelineSteps = [
              { label: 'Filed', date: c.createdAt, done: true },
              { label: 'Investigating', date: c.escalatedAt || undefined, done: c.status === 'investigating' || c.status === 'in-progress' || c.status === 'resolved' || c.status === 'closed' || c.status === 'escalated' },
              { label: 'In Progress', date: c.updatedAt && c.status !== 'open' ? c.updatedAt : undefined, done: c.status === 'in-progress' || c.status === 'resolved' || c.status === 'closed' },
              { label: 'Resolved', date: c.resolvedAt, done: c.status === 'resolved' || c.status === 'closed' },
            ];

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <CatIcon className={`h-5 w-5 ${cfg.iconText}`} />
                    {c.subject}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={c.status === 'open' ? 'open' : c.status === 'escalated' ? 'urgent' : c.status} />
                    <Badge variant="outline" className={`text-[10px] ${cfg.iconBg} ${cfg.iconText} border-0`}>{cfg.label}</Badge>
                    <Badge variant="outline" className="text-[10px] border-white/10 gap-1">
                      <span className={`h-2 w-2 rounded-full ${priorityDot[c.priority] || 'bg-slate-400'}`} />
                      {priorityLabel[c.priority] || c.priority}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${severityColor[c.severity] || 'bg-slate-500/20 text-slate-400'} border-0`}>
                      {severityLabel[c.severity] || c.severity}
                    </Badge>
                    {c.isAnonymous && (
                      <Badge variant="outline" className="text-[10px] bg-slate-500/20 text-slate-400 border-slate-500/30 gap-1">
                        <Shield className="h-2.5 w-2.5" /> Anonymous
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
                    <p className="text-sm whitespace-pre-wrap">{c.description}</p>
                  </div>

                  {/* Assignee */}
                  {c.assigneeName && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Assigned To</h4>
                      <p className="text-sm">{c.assigneeName}</p>
                    </div>
                  )}

                  {/* Resolution Notes */}
                  {c.resolution && (
                    <GlassCard className="p-4" glow="emerald">
                      <h4 className="text-xs font-medium text-emerald-400 mb-1">Resolution Notes</h4>
                      <p className="text-sm whitespace-pre-wrap">{c.resolution}</p>
                      {c.resolverName && (
                        <p className="text-xs text-muted-foreground mt-2">Resolved by {c.resolverName}</p>
                      )}
                    </GlassCard>
                  )}

                  {/* Status Timeline */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-3">Status Timeline</h4>
                    <div className="space-y-0">
                      {timelineSteps.map((step, i) => (
                        <div key={step.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`rounded-full h-3 w-3 shrink-0 ${step.done ? 'bg-emerald-400' : 'bg-white/10'}`} />
                            {i < timelineSteps.length - 1 && (
                              <div className={`w-0.5 h-8 ${step.done ? 'bg-emerald-400/40' : 'bg-white/10'}`} />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className={`text-sm font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                            {step.date && step.done && (
                              <p className="text-xs text-muted-foreground">{timeAgo(step.date)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anonymous Shield */}
                  {c.isAnonymous && (
                    <GlassCard className="p-4 flex items-center gap-3" glow="cyan">
                      <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-cyan-400">Anonymity Protected</p>
                        <p className="text-xs text-muted-foreground">Your identity is concealed. Only authorized personnel can view your details under strict protocol.</p>
                      </div>
                    </GlassCard>
                  )}

                  {/* Meta */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created: {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString()}</p>
                    {c.updatedAt && <p>Updated: {timeAgo(c.updatedAt)}</p>}
                  </div>

                  {/* Withdraw button */}
                  {c.status === 'open' && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => handleWithdraw(c.id)}
                    >
                      <XCircle className="h-4 w-4" /> Withdraw Complaint
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
