'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { AdminLeaveCommandCenter } from './admin-leave-command-center';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, CalendarDays, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Clock,
  TrendingUp, AlertCircle, Heart, Palmtree, Briefcase, Baby, UserX, Users, Sparkles,
} from 'lucide-react';
import type { Leave } from '@/lib/types';

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  item: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } },
};

const TYPE_COLORS: Record<string, string> = {
  sick: 'bg-rose-500', casual: 'bg-amber-500', vacation: 'bg-emerald-500',
  maternity: 'bg-pink-500', paternity: 'bg-cyan-500', unpaid: 'bg-slate-400',
};
const TYPE_DOTS: Record<string, string> = {
  sick: 'bg-rose-400', casual: 'bg-amber-400', vacation: 'bg-emerald-400',
  maternity: 'bg-pink-400', paternity: 'bg-cyan-400', unpaid: 'bg-slate-400',
};
const TYPE_LABELS: Record<string, string> = {
  sick: 'Sick', casual: 'Casual', vacation: 'Vacation',
  maternity: 'Maternity', paternity: 'Paternity', unpaid: 'Unpaid',
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  sick: Heart, casual: Briefcase, vacation: Palmtree,
  maternity: Baby, paternity: Baby, unpaid: UserX,
};
const TYPE_BADGE_COLORS: Record<string, string> = {
  sick: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  casual: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vacation: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  maternity: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  paternity: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  unpaid: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

/* ── SVG Pie Chart ────────────────────────────────────── */
function LeaveTypePie({ data }: { data: { type: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const cx = 80, cy = 80, r = 60;
  const COLORS_MAP: Record<string, string> = {
    sick: '#f43f5e', casual: '#f59e0b', vacation: '#10b981',
    maternity: '#ec4899', paternity: '#06b6d4', unpaid: '#94a3b8',
  };

  // Pre-compute pie slice angles using reduce to avoid mutable reassignment
  const slices = useMemo(() => {
    return data.reduce<Array<{ type: string; d: string }>>((acc, seg, idx) => {
      const prevEnd = idx === 0 ? -90 : (() => {
        let a = -90;
        for (let i = 0; i < idx; i++) { a += (data[i].count / total) * 360; }
        return a;
      })();
      const pct = seg.count / total;
      const sweep = pct * 360;
      const endAngle = prevEnd + sweep;
      const startRad = (prevEnd * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = sweep > 180 ? 1 : 0;
      const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
      acc.push({ type: seg.type, d });
      return acc;
    }, []);
  }, [data, total]);

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px] mx-auto">
      {slices.map(s => (
        <motion.path key={s.type} d={s.d} fill={COLORS_MAP[s.type] || '#94a3b8'}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }} style={{ transformOrigin: `${cx}px ${cy}px` }} />
      ))}
      <circle cx={cx} cy={cy} r={30} className="fill-background" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground text-xs font-bold">{total}</text>
    </svg>
  );
}

/* ── Leave Balance Progress Bar ──────────────────────── */
function LeaveBalanceBar({ type, used, total, color }: { type: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = total - used;
  const Icon = TYPE_ICONS[type] || Briefcase;
  const colorMap: Record<string, string> = {
    sick: 'from-rose-500 to-rose-400', casual: 'from-amber-500 to-amber-400',
    vacation: 'from-emerald-500 to-emerald-400', maternity: 'from-pink-500 to-pink-400',
    paternity: 'from-cyan-500 to-cyan-400', unpaid: 'from-slate-500 to-slate-400',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-foreground/80">
          <Icon className="h-3 w-3" /> {TYPE_LABELS[type] || type}
        </span>
        <span className="text-[10px] text-muted-foreground">{remaining}/{total} left</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div className={`h-full rounded-full bg-gradient-to-r ${colorMap[type] || colorMap.unpaid}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

/* ── Status Timeline ─────────────────────────────────── */
function StatusTimeline({ status }: { status: Leave['status'] }) {
  const steps = [
    { key: 'submitted', label: 'Submitted', done: true },
    { key: 'reviewed', label: 'Reviewed', done: status !== 'pending' },
    { key: status === 'rejected' ? 'rejected' : 'approved', label: status === 'rejected' ? 'Rejected' : 'Approved', done: status === 'approved' || status === 'rejected' },
  ];

  return (
    <div className="flex items-center gap-0.5 mt-2">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-0.5">
          <div className={`w-2 h-2 rounded-full transition-colors ${step.done ? (step.key === 'rejected' ? 'bg-rose-400' : 'bg-emerald-400') : 'bg-white/20'}`} />
          <span className="text-[9px] text-muted-foreground">{step.label}</span>
          {i < steps.length - 1 && <div className={`w-4 h-px ${step.done ? 'bg-emerald-400/50' : 'bg-white/10'}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Team Availability ───────────────────────────────── */
function TeamAvailability() {
  const { users, leaves } = useEMSStore();
  const today = new Date().toISOString().slice(0, 10);
  const awayUsers = useMemo(() => {
    return leaves
      .filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today)
      .map(l => {
        const u = users.find(u2 => u2.id === l.userId);
        return { name: u?.name || l.userName || 'Unknown', type: l.type, endDate: l.endDate };
      });
  }, [leaves, users, today]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold">Team Availability</span>
        <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded-full">{awayUsers.length} away</span>
      </div>
      {awayUsers.length > 0 ? (
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {awayUsers.slice(0, 5).map((u, i) => (
            <motion.div key={i} className="flex items-center gap-2 text-xs" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">
                {u.name.charAt(0)}
              </div>
              <span className="text-foreground/80 truncate">{u.name}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] border ${TYPE_BADGE_COLORS[u.type] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                {TYPE_LABELS[u.type] || u.type}
              </span>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Everyone is available today!
        </p>
      )}
    </div>
  );
}

/* ── Calendar Component ───────────────────────────────── */
function Calendar({ leaves, onDateClick }: { leaves: Leave[]; onDateClick: (d: string) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startDay = (new Date(month.y, month.m, 1).getDay() + 6) % 7;

  const leaveMap = useMemo(() => {
    const m: Record<string, Leave[]> = {};
    leaves.filter(l => l.status === 'approved').forEach(l => {
      const s = new Date(l.startDate), e = new Date(l.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month.m && d.getFullYear() === month.y) {
          const key = d.getDate().toString();
          (m[key] ??= []).push(l);
        }
      }
    });
    return m;
  }, [leaves, month]);

  const prev = () => setMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 });
  const next = () => setMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 });
  const monthName = new Date(month.y, month.m).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-2 max-w-[320px] sm:max-w-none">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold">{monthName}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayLeaves = leaveMap[day.toString()] || [];
          const today = new Date();
          const isToday = day === today.getDate() && month.m === today.getMonth() && month.y === today.getFullYear();
          return (
            <button key={day} onClick={() => onDateClick(`${month.y}-${String(month.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)}
              className={`relative h-9 w-9 sm:h-8 sm:w-8 rounded-md text-xs flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-white/10
                ${isToday ? 'bg-emerald-500/20 text-emerald-400 font-bold ring-1 ring-emerald-500/40' : 'text-foreground/80'}`}>
              {day}
              {dayLeaves.length > 0 && (
                <div className="flex gap-0.5">{dayLeaves.slice(0, 3).map((l, j) => (
                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${TYPE_DOTS[l.type] || 'bg-slate-400'}`} />
                ))}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Leave Type Badge with Icon ──────────────────────── */
function LeaveTypeBadge({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] || Briefcase;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${TYPE_BADGE_COLORS[type] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
      <Icon className="h-3 w-3" /> {TYPE_LABELS[type] || type}
    </span>
  );
}

/* ── Quick Apply FAB ─────────────────────────────────── */
function QuickApplyFAB({ onClick }: { onClick: () => void }) {
  const spring = useSpring(1, { stiffness: 400, damping: 20 });
  return (
    <motion.button
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/25 flex items-center justify-center text-white"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={{ scale: spring }}
      onClick={onClick}
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
    >
      <Plus className="h-6 w-6" />
    </motion.button>
  );
}

function LeaveStandardView() {
  const { user, leaves, leaveBalance, applyLeave, approveLeave, users } = useEMSStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: 'casual' as Leave['type'], startDate: '', endDate: '', reason: '' });
  const [filter, setFilter] = useState('all');

  const isManager = user?.role === 'manager';
  const myLeaves = leaves.filter(l => l.userId === user?.id);
  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const filteredLeaves = filter === 'all' ? myLeaves : myLeaves.filter(l => l.status === filter);

  const stats = useMemo(() => {
    const myLeavesInner = leaves.filter(l => l.userId === user?.id);
    const approved = myLeavesInner.filter(l => l.status === 'approved');
    const totalDays = approved.reduce((s, l) => {
      const d1 = new Date(l.startDate), d2 = new Date(l.endDate);
      return s + Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1);
    }, 0);
    const remaining = leaveBalance ? leaveBalance.casual.remaining + leaveBalance.sick.remaining + leaveBalance.vacation.remaining : 0;
    return { totalTaken: totalDays, remaining, pending: myLeavesInner.filter(l => l.status === 'pending').length };
  }, [leaves, user, leaveBalance]);

  /* Leave type distribution data */
  const leaveDist = useMemo(() => {
    const map: Record<string, number> = {};
    leaves.filter(l => l.userId === user?.id).forEach(l => { map[l.type] = (map[l.type] || 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [leaves, user?.id]);

  const handleApply = async () => {
    if (!form.startDate || !form.endDate || !form.reason) { toast.error('Please fill all fields'); return; }
    try {
      await applyLeave({ userId: user!.id, type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason });
      toast.success('Leave application submitted');
      setDialogOpen(false);
      setForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
    } catch { toast.error('Failed to apply for leave'); }
  };

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    try { await approveLeave(id, status); toast.success(`Leave ${status}`); }
    catch { toast.error(`Failed to ${status} leave`); }
  };

  const openQuickApply = (date: string) => {
    setForm(f => ({ ...f, startDate: date, endDate: date }));
    setDialogOpen(true);
  };

  return (
    <motion.div className="space-y-6" variants={stagger.container} initial="initial" animate="animate">
      {/* Stats */}
      <motion.div variants={stagger.item} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Days Taken', value: stats.totalTaken, icon: CalendarDays, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Remaining', value: stats.remaining, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        ].map(s => (
          <GlassCard key={s.label} className="p-3" hover>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
            </div>
          </GlassCard>
        ))}
      </motion.div>

      {/* Leave Balance Progress Bars */}
      {leaveBalance && (
        <motion.div variants={stagger.item}>
          <GlassCard className="p-5" hover glow="emerald">
            <h4 className="text-sm font-semibold mb-3">Leave Balance</h4>
            <div className="space-y-3">
              {['sick', 'casual', 'vacation'].map(type => {
                const b = leaveBalance[type];
                return b ? <LeaveBalanceBar key={type} type={type} used={b.used} total={b.total} color="" /> : null;
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Pie Chart + Team Availability */}
      <motion.div variants={stagger.item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-5" hover>
          <h4 className="text-sm font-semibold mb-3">Leave Distribution</h4>
          {leaveDist.length > 0 ? (
            <>
              <LeaveTypePie data={leaveDist} />
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {leaveDist.map(d => (
                  <span key={d.type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[d.type]}`} /> {TYPE_LABELS[d.type]}: {d.count}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">No leave data yet</p>
          )}
        </GlassCard>
        <GlassCard className="p-5" hover>
          <TeamAvailability />
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        <Tabs defaultValue="my-leaves" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
              {isManager && <TabsTrigger value="pending">Pending</TabsTrigger>}
            </TabsList>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500" size="sm">
                  <Plus className="h-4 w-4" />Apply Leave
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-white/20 max-w-[calc(100%-1rem)] sm:max-w-md">
                <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as Leave['type'] })}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l} Leave</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Start</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>End</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Describe your reason..." className="bg-white/5 border-white/10 min-h-[60px]" /></div>
                  <Button onClick={handleApply} className="w-full bg-emerald-600 hover:bg-emerald-500">Submit Application</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="my-leaves" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['all','pending','approved','rejected'].map(f => (
                <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}
                  className={filter === f ? 'bg-emerald-600' : 'border-white/10'}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {filteredLeaves.map(l => (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    <GlassCard className="p-3" hover>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <LeaveTypeBadge type={l.type} />
                            <StatusBadge status={l.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{l.startDate} → {l.endDate}</p>
                          {l.reason && <p className="text-xs text-muted-foreground/70 truncate">{l.reason}</p>}
                          <StatusTimeline status={l.status} />
                        </div>
                        {l.status === 'pending' && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredLeaves.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No leaves found</p>}
            </div>
          </TabsContent>

          {isManager && (
            <TabsContent value="pending" className="space-y-3 max-h-[400px] overflow-y-auto">
              {pendingLeaves.map(l => (
                <GlassCard key={l.id} className="p-3" hover>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <LeaveTypeBadge type={l.type} />
                        <span className="font-medium text-sm">{l.userName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{l.startDate} → {l.endDate}</p>
                      {l.reason && <p className="text-xs text-muted-foreground/70 truncate">{l.reason}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 px-2"
                        onClick={() => handleApprove(l.id, 'approved')}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-7 px-2"
                        onClick={() => handleApprove(l.id, 'rejected')}><XCircle className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
              {pendingLeaves.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No pending leaves</p>}
            </TabsContent>
          )}
        </Tabs>

        {/* Sidebar: Calendar + Legend */}
        <div className="space-y-4">
          <GlassCard className="p-3">
            <Calendar leaves={myLeaves} onDateClick={openQuickApply} />
            <p className="text-[10px] text-muted-foreground/60 text-center mt-1">Click a date to quick-apply</p>
          </GlassCard>
          <GlassCard className="p-3">
            <p className="text-xs font-semibold mb-2">Leave Types</p>
            <div className="space-y-1.5">
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[k]}`} />
                  <span className="text-foreground/80">{label}</span>
                  {leaveBalance && leaveBalance[k as keyof typeof leaveBalance] && (
                    <span className="ml-auto text-muted-foreground">
                      {leaveBalance[k as keyof typeof leaveBalance].remaining}/{leaveBalance[k as keyof typeof leaveBalance].total}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Quick Apply FAB */}
      <QuickApplyFAB onClick={() => { setForm({ type: 'casual', startDate: '', endDate: '', reason: '' }); setDialogOpen(true); }} />
    </motion.div>
  );
}

export function LeaveView() {
  const user = useEMSStore(s => s.user);
  if (user?.role === 'admin') return <AdminLeaveCommandCenter />;
  return <LeaveStandardView />;
}
