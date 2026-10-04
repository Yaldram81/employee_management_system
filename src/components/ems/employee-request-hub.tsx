'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Palmtree, DollarSign, Monitor, ArrowLeftRight, GraduationCap,
  Wrench, Plane, Headphones, Eye, XCircle, Pencil, RotateCcw,
  Inbox, CheckCircle2, Clock, AlertCircle, FileText, Send,
} from 'lucide-react';
import type { Request } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { priorityDot, timeAgo } from './shared';

/* ─── Config ─── */
const typeConfig: Record<string, { icon: LucideIcon; color: string; label: string; iconBg: string; iconText: string }> = {
  'leave': { icon: Palmtree, color: 'emerald', label: 'Leave', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400' },
  'expense': { icon: DollarSign, color: 'amber', label: 'Expense', iconBg: 'bg-amber-500/20', iconText: 'text-amber-400' },
  'asset': { icon: Monitor, color: 'cyan', label: 'Asset', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400' },
  'shift-swap': { icon: ArrowLeftRight, color: 'violet', label: 'Shift Swap', iconBg: 'bg-violet-500/20', iconText: 'text-violet-400' },
  'training': { icon: GraduationCap, color: 'blue', label: 'Training', iconBg: 'bg-blue-500/20', iconText: 'text-blue-400' },
  'equipment': { icon: Wrench, color: 'orange', label: 'Equipment', iconBg: 'bg-orange-500/20', iconText: 'text-orange-400' },
  'travel': { icon: Plane, color: 'rose', label: 'Travel', iconBg: 'bg-rose-500/20', iconText: 'text-rose-400' },
  'it-support': { icon: Headphones, color: 'teal', label: 'IT Support', iconBg: 'bg-teal-500/20', iconText: 'text-teal-400' },
};

const statGlowMap: Record<string, 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate' | 'none'> = {
  total: 'slate', pending: 'amber', approved: 'emerald', rejected: 'rose', review: 'cyan', amount: 'emerald',
};

type FormState = {
  type: Request['type']; title: string; description: string; priority: Request['priority'];
  amount: string; dueDate: string; dynamicFields: Record<string, string>;
};

const emptyForm = (): FormState => ({
  type: 'leave', title: '', description: '', priority: 'medium', amount: '', dueDate: '', dynamicFields: {},
});

/* ─── Component ─── */
export function EmployeeRequestHub() {
  const { user, requests, createRequest, updateRequest } = useEMSStore();
  const myRequests = useMemo(() => requests.filter(r => r.userId === user?.id), [requests, user?.id]);

  const [filter, setFilter] = useState('all');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<Request | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  /* Stats */
  const stats = useMemo(() => {
    const pending = myRequests.filter(r => r.status === 'pending').length;
    const approved = myRequests.filter(r => r.status === 'approved').length;
    const rejected = myRequests.filter(r => r.status === 'rejected').length;
    const underReview = myRequests.filter(r => r.status === 'under-review').length;
    const totalAmount = myRequests.reduce((s, r) => s + (r.amount || 0), 0);
    return { total: myRequests.length, pending, approved, rejected, underReview, totalAmount };
  }, [myRequests]);

  const filtered = useMemo(() => {
    if (filter === 'all') return myRequests;
    return myRequests.filter(r => r.status === filter);
  }, [myRequests, filter]);

  /* Handlers */
  const openNewRequest = (preType?: Request['type']) => {
    setForm({ ...emptyForm(), type: preType || 'leave' });
    setPreviewMode(false);
    setNewDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      await createRequest({
        userId: user!.id, type: form.type, title: form.title.trim(),
        description: form.description.trim(), priority: form.priority,
        amount: form.amount ? parseFloat(form.amount) : undefined, dueDate: form.dueDate || undefined,
      });
      toast.success('Request submitted successfully');
      setNewDialogOpen(false);
      setForm(emptyForm());
    } catch { toast.error('Failed to submit request'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id: string) => {
    try { await updateRequest(id, 'cancelled'); toast.success('Request cancelled'); setDetailSheet(null); }
    catch { toast.error('Failed to cancel request'); }
  };

  const handleEdit = (req: Request) => {
    setEditForm({
      type: req.type, title: req.title, description: req.description, priority: req.priority,
      amount: req.amount?.toString() || '', dueDate: req.dueDate || '', dynamicFields: {},
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      await updateRequest(detailSheet!.id, detailSheet!.status);
      toast.success('Request updated');
      setEditDialogOpen(false);
    } catch { toast.error('Failed to update request'); }
    finally { setSubmitting(false); }
  };

  const handleResubmit = async (req: Request) => {
    setForm({ type: req.type, title: req.title, description: req.description, priority: req.priority,
      amount: req.amount?.toString() || '', dueDate: req.dueDate || '', dynamicFields: {} });
    setPreviewMode(false);
    setNewDialogOpen(true);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-semibold">{firstName}</span> — {stats.total} request{stats.total !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <Button onClick={() => openNewRequest()} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </motion.div>

      {/* Quick Stats — 4 key cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Requests</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.total}</p>
                <p className="text-[10px] text-cyan-400/80">All time</p>
              </div>
              <div className="rounded-xl p-3 bg-cyan-500/10 text-cyan-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-cyan-400 font-semibold">{stats.underReview}</span> reviewing</span>
              <span className="text-[10px] text-muted-foreground">Claimed <span className="text-emerald-400 font-semibold">${stats.totalAmount.toLocaleString()}</span></span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="amber">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-amber-500/5" />
            {stats.pending > 0 && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 animate-pulse z-10" />}
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                <p className="text-[10px] text-amber-400/80">Awaiting review</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10 text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground">Under review <span className="text-cyan-400 font-semibold">{stats.underReview}</span></span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
                <p className="text-[10px] text-emerald-400/80">{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% approval rate</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10 text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-rose-400 font-semibold">{stats.rejected}</span> rejected</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Claimed</p>
                <p className="text-2xl font-bold text-emerald-400">${stats.totalAmount.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-400/80">Expense claims</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10 text-emerald-400 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground">Across all requests</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Request Templates */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: 'leave' as Request['type'], icon: Palmtree, label: 'Request Leave', bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-400/40', iconColor: 'text-emerald-400' },
            { type: 'expense' as Request['type'], icon: DollarSign, label: 'Claim Expense', bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-400/40', iconColor: 'text-amber-400' },
            { type: 'equipment' as Request['type'], icon: Wrench, label: 'Request Equipment', bg: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-400/40', iconColor: 'text-orange-400' },
            { type: 'it-support' as Request['type'], icon: Headphones, label: 'IT Support', bg: 'bg-teal-500/10 border-teal-500/20 hover:border-teal-400/40', iconColor: 'text-teal-400' },
          ].map((t, i) => (
            <motion.div key={t.type} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
              <GlassCard hover onClick={() => openNewRequest(t.type)} className={`p-4 cursor-pointer border ${t.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${t.type === 'leave' ? 'bg-emerald-500/20' : t.type === 'expense' ? 'bg-amber-500/20' : t.type === 'equipment' ? 'bg-orange-500/20' : 'bg-teal-500/20'}`}>
                    <t.icon className={`h-5 w-5 ${t.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status Filter Tabs + Request List */}
      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] h-auto flex-wrap">
          {['all', 'pending', 'under-review', 'approved', 'rejected', 'cancelled'].map(f => (
            <TabsTrigger key={f} value={f} className="text-xs capitalize data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              {f === 'under-review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((req, i) => {
              const cfg = typeConfig[req.type] || typeConfig['leave'];
              const Icon = cfg.icon;
              return (
                <motion.div key={req.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}>
                  <GlassCard hover onClick={() => setDetailSheet(req)} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`rounded-lg p-2 shrink-0 ${cfg.iconBg}`}>
                          <Icon className={`h-4 w-4 ${cfg.iconText}`} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{req.title}</span>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[req.priority]}`} title={req.priority} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{req.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={req.status} />
                            {req.amount != null && req.amount > 0 && (
                              <span className="text-xs font-medium text-emerald-400">${req.amount.toLocaleString()}</span>
                            )}
                            <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                            {req.reviewerName && <span className="text-xs text-muted-foreground">by {req.reviewerName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailSheet(req)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {req.status === 'pending' && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={() => handleCancel(req.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty State */}
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlassCard className="p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-black/[0.03] dark:bg-white/[0.05] p-4">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {filter === 'all' ? 'No requests yet' : `No ${filter.replace('-', ' ')} requests`}
                  </p>
                  <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => openNewRequest()}>
                    <Plus className="h-4 w-4" /> Create your first request
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </Tabs>

      {/* ─── New Request Dialog ─── */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-400" /> New Request</DialogTitle>
          </DialogHeader>

          {!previewMode ? (
            <div className="space-y-4 py-2">
              {/* Type Selector Grid */}
              <div className="space-y-2">
                <Label>Request Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(typeConfig).map(([key, cfg]) => (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, type: key as Request['type'] }))}
                      className={`flex flex-col items-center gap-1 rounded-lg p-2 border transition-all text-xs ${form.type === key
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]'}`}>
                      <cfg.icon className="h-4 w-4" />
                      <span className="truncate">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Request title..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground text-xs">({form.description.length}/500)</span></Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 500) }))} placeholder="Describe your request..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Request['priority'] }))}>
                    <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low</SelectItem>
                      <SelectItem value="medium">🔵 Medium</SelectItem>
                      <SelectItem value="high">🟡 High</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
              </div>

              {/* Dynamic fields by type */}
              {(form.type === 'expense' || form.type === 'travel') && (
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
              )}
              {form.type === 'leave' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.dynamicFields.startDate || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, startDate: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.dynamicFields.endDate || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, endDate: e.target.value } }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'expense' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Category</Label>
                    <Select value={form.dynamicFields.category || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, category: v === '_none' ? '' : v } }))}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select...</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem><SelectItem value="meals">Meals</SelectItem>
                        <SelectItem value="office">Office Supplies</SelectItem><SelectItem value="software">Software</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Receipt #</Label><Input value={form.dynamicFields.receipt || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, receipt: e.target.value } }))} placeholder="Receipt number" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'asset' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Asset Type</Label>
                    <Select value={form.dynamicFields.assetType || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, assetType: v === '_none' ? '' : v } }))}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select...</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem><SelectItem value="monitor">Monitor</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem><SelectItem value="desk">Desk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Justification</Label><Input value={form.dynamicFields.justification || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, justification: e.target.value } }))} placeholder="Why needed..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'shift-swap' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Current Shift</Label><Input value={form.dynamicFields.currentShift || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, currentShift: e.target.value } }))} placeholder="e.g. 9AM-5PM" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  <div className="space-y-2"><Label>Desired Shift</Label><Input value={form.dynamicFields.desiredShift || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, desiredShift: e.target.value } }))} placeholder="e.g. 10AM-6PM" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'training' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Course Name</Label><Input value={form.dynamicFields.course || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, course: e.target.value } }))} placeholder="Course name" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  <div className="space-y-2"><Label>Provider</Label><Input value={form.dynamicFields.provider || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, provider: e.target.value } }))} placeholder="Training provider" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'equipment' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Equipment Type</Label>
                    <Select value={form.dynamicFields.equipType || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, equipType: v === '_none' ? '' : v } }))}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select...</SelectItem>
                        <SelectItem value="keyboard">Keyboard</SelectItem><SelectItem value="mouse">Mouse</SelectItem>
                        <SelectItem value="headset">Headset</SelectItem><SelectItem value="chair">Chair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Justification</Label><Input value={form.dynamicFields.justification || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, justification: e.target.value } }))} placeholder="Why needed..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'travel' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Destination</Label><Input value={form.dynamicFields.destination || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, destination: e.target.value } }))} placeholder="City, Country" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                  <div className="space-y-2"><Label>Travel Dates</Label><Input value={form.dynamicFields.travelDates || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, travelDates: e.target.value } }))} placeholder="e.g. Mar 10-15" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}
              {form.type === 'it-support' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Issue Category</Label>
                    <Select value={form.dynamicFields.issueCat || '_none'} onValueChange={v => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, issueCat: v === '_none' ? '' : v } }))}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select...</SelectItem>
                        <SelectItem value="hardware">Hardware</SelectItem><SelectItem value="software">Software</SelectItem>
                        <SelectItem value="network">Network</SelectItem><SelectItem value="access">Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Device</Label><Input value={form.dynamicFields.device || ''} onChange={e => setForm(f => ({ ...f, dynamicFields: { ...f.dynamicFields, device: e.target.value } }))} placeholder="e.g. MacBook Pro" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => setPreviewMode(true)}>
                  <Eye className="h-4 w-4" /> Preview
                </Button>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-4 py-2">
              <GlassCard className="p-4" glow="emerald">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {(() => { const cfg = typeConfig[form.type]; const PIcon = cfg.icon; return <><div className={`rounded-lg p-1.5 ${cfg.iconBg}`}><PIcon className={`h-4 w-4 ${cfg.iconText}`} /></div><Badge variant="outline" className="text-xs">{cfg.label}</Badge></>; })()}
                    <span className={`h-2 w-2 rounded-full ${priorityDot[form.priority]}`} />
                    <span className="text-xs capitalize text-muted-foreground">{form.priority}</span>
                  </div>
                  <h3 className="font-semibold">{form.title || 'Untitled'}</h3>
                  <p className="text-sm text-muted-foreground">{form.description || 'No description'}</p>
                  {(form.amount || form.dueDate) && (
                    <div className="flex gap-3 text-xs">
                      {form.amount && <span className="text-emerald-400 font-medium">${parseFloat(form.amount).toLocaleString()}</span>}
                      {form.dueDate && <span className="text-muted-foreground">Due: {form.dueDate}</span>}
                    </div>
                  )}
                </div>
              </GlassCard>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPreviewMode(false)}>Back to Edit</Button>
                <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" /> : <Send className="h-4 w-4" />}
                  Submit Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Request Detail Sheet ─── */}
      <Sheet open={!!detailSheet} onOpenChange={o => !o && setDetailSheet(null)}>
        <SheetContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md overflow-y-auto">
          {detailSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => { const cfg = typeConfig[detailSheet.type]; const DIcon = cfg.icon; return <div className={`rounded-lg p-1.5 ${cfg.iconBg}`}><DIcon className={`h-4 w-4 ${cfg.iconText}`} /></div>; })()}
                  {detailSheet.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={detailSheet.status} />
                  <Badge variant="outline" className="text-xs capitalize">{detailSheet.type.replace('-', ' ')}</Badge>
                  <span className={`h-2 w-2 rounded-full mt-1.5 ${priorityDot[detailSheet.priority]}`} />
                  <span className="text-xs capitalize text-muted-foreground mt-1">{detailSheet.priority}</span>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-muted-foreground">{detailSheet.description}</p>
                </div>

                {/* Amount / Date */}
                {(detailSheet.amount != null && detailSheet.amount > 0) && (
                  <div className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-medium text-emerald-400">${detailSheet.amount.toLocaleString()}</span></div>
                )}
                {detailSheet.dueDate && (
                  <div className="text-sm"><span className="text-muted-foreground">Due:</span> <span className="font-medium">{detailSheet.dueDate}</span></div>
                )}

                {/* Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h4>
                  <div className="relative pl-4 border-l border-black/[0.1] dark:border-white/[0.1] space-y-3">
                    <div className="relative">
                      <span className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-cyan-500 border-2 border-background" />
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">{new Date(detailSheet.createdAt).toLocaleString()}</p>
                    </div>
                    {(detailSheet.status === 'under-review' || detailSheet.status === 'approved' || detailSheet.status === 'rejected') && (
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-amber-500 border-2 border-background" />
                        <p className="text-sm font-medium">Under Review</p>
                        {detailSheet.updatedAt && <p className="text-xs text-muted-foreground">{new Date(detailSheet.updatedAt).toLocaleString()}</p>}
                      </div>
                    )}
                    {(detailSheet.status === 'approved' || detailSheet.status === 'rejected') && (
                      <div className="relative">
                        <span className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-background ${detailSheet.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <p className="text-sm font-medium capitalize">{detailSheet.status}</p>
                        {detailSheet.reviewerName && <p className="text-xs text-muted-foreground">by {detailSheet.reviewerName}</p>}
                        {detailSheet.resolvedAt && <p className="text-xs text-muted-foreground">{new Date(detailSheet.resolvedAt).toLocaleString()}</p>}
                      </div>
                    )}
                    {detailSheet.status === 'cancelled' && (
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-slate-500 border-2 border-background" />
                        <p className="text-sm font-medium">Cancelled</p>
                        {detailSheet.cancelledAt && <p className="text-xs text-muted-foreground">{new Date(detailSheet.cancelledAt).toLocaleString()}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Comment */}
                {detailSheet.reviewComment && (
                  <GlassCard className="p-3" glow={detailSheet.status === 'approved' ? 'emerald' : 'rose'}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Review Comment</p>
                    <p className="text-sm">{detailSheet.reviewComment}</p>
                  </GlassCard>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {detailSheet.status === 'pending' && (
                    <>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => { handleEdit(detailSheet); setDetailSheet(null); }}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => handleCancel(detailSheet.id)}>
                        <XCircle className="h-4 w-4" /> Cancel
                      </Button>
                    </>
                  )}
                  {detailSheet.status === 'rejected' && (
                    <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => { handleResubmit(detailSheet); setDetailSheet(null); }}>
                      <RotateCcw className="h-4 w-4" /> Re-submit
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Edit Request Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-emerald-400" /> Edit Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" /></div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v as Request['priority'] }))}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500" disabled={submitting} onClick={handleEditSave}>
              {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
