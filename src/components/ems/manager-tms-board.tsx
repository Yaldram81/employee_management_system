'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { CreateTaskModal } from './create-task-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  ListTodo, CheckCircle2, Clock, Plus, Check, X,
  Users, ArrowRight, MessageSquare, AlertTriangle,
  ChevronRight, Search, CalendarDays,
  LayoutGrid, List, GanttChart, Trash2, Copy, ArrowUpCircle,
  MessageCircle, Unlock, Send, UserCheck,
  Timer, BarChart3, Activity, Eye,
  ChevronUp, ChevronDown, RotateCcw, UserPlus, FileText,
  TrendingUp, TrendingDown, Minus, Download, Zap,
  AlertCircle, Flame, Target, PieChart as PieIcon, Loader2,
} from 'lucide-react';
import { timeAgo } from './shared';

// ─── Constants ──────────────────────────────────────────────────
const statusFlow: Task['status'][] = ['todo', 'in-progress', 'in-review', 'blocked', 'done'];
const nextStatusMap: Record<string, Task['status']> = {
  'todo': 'in-progress', 'in-progress': 'in-review', 'in-review': 'done', 'blocked': 'in-progress',
};

const kanbanCols: { id: Task['status']; title: string; accent: string; border: string }[] = [
  { id: 'todo', title: 'To Do', accent: 'bg-slate-400', border: 'border-slate-400' },
  { id: 'in-progress', title: 'In Progress', accent: 'bg-amber-400', border: 'border-amber-400' },
  { id: 'in-review', title: 'In Review', accent: 'bg-cyan-400', border: 'border-cyan-400' },
  { id: 'blocked', title: 'Blocked', accent: 'bg-rose-400', border: 'border-rose-400' },
  { id: 'done', title: 'Done', accent: 'bg-emerald-400', border: 'border-emerald-400' },
];

const priorityColor: Record<string, string> = {
  low: 'border-l-slate-400', medium: 'border-l-cyan-400', high: 'border-l-amber-400', urgent: 'border-l-rose-400',
};

const CHART_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#64748b'];

type SortKey = 'title' | 'priority' | 'status' | 'dueDate' | 'assigneeName' | 'teamName';
type SortDir = 'asc' | 'desc';
type ViewMode = 'kanban' | 'list';

// ─── Helpers ────────────────────────────────────────────────────
function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]);
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return d; }
}

function getTimeEntries(task: Task) {
  const entries: Array<{ hours: number; date: string; note: string }> = [];
  for (const c of (task.comments || [])) {
    if (c.comment.startsWith('[TIME]')) {
      try { const d = JSON.parse(c.comment.slice(6)); entries.push({ hours: d.hours || 0, date: d.date || '', note: d.note || '' }); }
      catch { entries.push({ hours: 0, date: '', note: c.comment.slice(6) }); }
    }
  }
  return { totalHours: entries.reduce((s, e) => s + e.hours, 0), entries };
}

// ─── Kanban Task Card ───────────────────────────────────────────
function KanbanTaskCard({ task, selected, onToggleSelect, onClick, onMoveNext, onApprove, onResolveBlocker }: {
  task: Task; selected: boolean; onToggleSelect: () => void;
  onClick: () => void; onMoveNext: () => void; onApprove?: () => void; onResolveBlocker?: () => void;
}) {
  const overdue = isOverdue(task);
  const td = getTimeEntries(task);
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <GlassCard className={cn('p-3 cursor-pointer border-l-2 group relative', priorityColor[task.priority] || 'border-l-slate-400', overdue && 'border-l-rose-500', selected && 'ring-1 ring-cyan-500/50')} hover onClick={onClick}>
        <div className="absolute top-1.5 left-1.5 z-10" onClick={e => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="h-3.5 w-3.5 border-black/[0.15] dark:border-white/[0.3] data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600" />
        </div>
        <p className="text-sm font-medium leading-tight mb-1.5 pl-5 pr-16">{task.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <StatusBadge status={task.priority} />
          {task.dueDate && <span className={cn('text-[10px] flex items-center gap-0.5', overdue ? 'text-rose-400 font-medium' : 'text-muted-foreground')}><Clock className="h-3 w-3" />{fmtDate(task.dueDate)}{overdue && ' !'}</span>}
          {td.totalHours > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Timer className="h-3 w-3" />{td.totalHours.toFixed(1)}h</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{task.assigneeName?.charAt(0) || '?'}</AvatarFallback></Avatar>
            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.assigneeName || 'Unassigned'}</span>
          </div>
          {task.teamName && <Badge variant="outline" className="text-[9px] h-4 px-1 border-cyan-500/20 text-cyan-400">{task.teamName}</Badge>}
        </div>
        {task.status === 'in-review' && <div className="mt-2"><Badge variant="outline" className="text-[9px] h-4 px-1 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">Awaiting Review</Badge></div>}
        {task.isBlocked && <div className="mt-2"><Badge variant="outline" className="text-[9px] h-4 px-1 border-rose-500/30 text-rose-400 bg-rose-500/10">Blocked</Badge></div>}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onMoveNext(); }} className="h-6 w-6 rounded bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30" title="Move next"><ArrowRight className="h-3 w-3 text-emerald-400" /></button>
          {task.status === 'in-review' && onApprove && <button onClick={e => { e.stopPropagation(); onApprove(); }} className="h-6 w-6 rounded bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30" title="Approve"><Check className="h-3 w-3 text-emerald-400" /></button>}
          {task.isBlocked && onResolveBlocker && <button onClick={e => { e.stopPropagation(); onResolveBlocker(); }} className="h-6 w-6 rounded bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30" title="Resolve"><Unlock className="h-3 w-3 text-amber-400" /></button>}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Task Detail Sheet ──────────────────────────────────────────
function TaskDetailSheet({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const store = useEMSStore();
  const [commentText, setCommentText] = useState('');
  const [showTimeEntry, setShowTimeEntry] = useState(false);
  const [timeHours, setTimeHours] = useState('');
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeNote, setTimeNote] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveScore, setApproveScore] = useState(75);
  const [approveComment, setApproveComment] = useState('');
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [changesComment, setChangesComment] = useState('');
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  if (!task) return null;
  const timeData = getTimeEntries(task);
  const overdue = isOverdue(task);
  const handleAddComment = async () => { if (!commentText.trim()) return; try { await store.addTaskComment(task.id, commentText.trim()); setCommentText(''); toast.success('Comment added'); } catch { toast.error('Failed'); } };
  const handleAddTimeEntry = async () => { const h = parseFloat(timeHours); if (!h || h <= 0) { toast.error('Enter valid hours'); return; } try { await store.addTaskComment(task.id, `[TIME]${JSON.stringify({ hours: h, date: timeDate, note: timeNote })}`); setShowTimeEntry(false); setTimeHours(''); setTimeNote(''); toast.success('Time entry added'); } catch { toast.error('Failed'); } };
  const handleApproveTask = async () => { try { await store.approveTask(task.id, approveScore, approveComment || undefined); toast.success('Approved'); setShowApproveDialog(false); } catch { toast.error('Failed'); } };
  const handleRequestChanges = async () => { if (!changesComment.trim()) { toast.error('Provide a comment'); return; } try { await store.requestTaskChanges(task.id, changesComment.trim()); toast.success('Changes requested'); setShowChangesDialog(false); setChangesComment(''); } catch { toast.error('Failed'); } };
  const handleReassign = async () => { try { await store.reassignTask(task.id, reassignUserId, reassignReason || undefined); toast.success('Reassigned'); setShowReassignDialog(false); setReassignUserId(''); setReassignReason(''); } catch { toast.error('Failed'); } };
  const handleStatusChange = async (s: string) => { try { await store.updateTask(task.id, { status: s as Task['status'] }); toast.success('Status updated'); } catch { toast.error('Failed'); } };
  const handlePriorityChange = async (p: string) => { try { await store.updateTask(task.id, { priority: p as Task['priority'] }); toast.success('Priority updated'); } catch { toast.error('Failed'); } };
  const handleMoveNext = async () => { const nxt = nextStatusMap[task.status]; if (!nxt) return; try { await store.updateTask(task.id, { status: nxt }); toast.success(`Moved to ${nxt}`); } catch { toast.error('Failed'); } };
  const handleDelete = async () => { try { await store.deleteTask(task.id); toast.success('Deleted'); onOpenChange(false); } catch { toast.error('Failed'); } };
  const handleResolveBlocker = async () => { try { await store.resolveTaskBlocker(task.id, 'Resolved via detail panel'); toast.success('Blocker resolved'); } catch { toast.error('Failed'); } };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] overflow-y-auto">
        <SheetHeader className="space-y-2 pb-4 border-b border-black/[0.1] dark:border-white/[0.1]">
          <SheetTitle>{task.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} /><StatusBadge status={task.priority} />
            {overdue && <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-xs">Overdue</Badge>}
            {task.performanceScore != null && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">Score: {task.performanceScore}</Badge>}
          </div>
        </SheetHeader>
        <div className="space-y-5 py-4">
          {task.description && <div><p className="text-xs text-muted-foreground mb-1 font-medium">Description</p><p className="text-sm">{task.description}</p></div>}
          <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-muted-foreground mb-1">Status</p><Select value={task.status} onValueChange={handleStatusChange}><SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent>{statusFlow.map(s => <SelectItem key={s} value={s}>{s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><p className="text-xs text-muted-foreground mb-1">Priority</p><Select value={task.priority} onValueChange={handlePriorityChange}><SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent>{(['low', 'medium', 'high', 'urgent'] as const).map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div><p className="text-xs text-muted-foreground mb-1">Assignee</p><Select value={task.assigneeId || '_none'} onValueChange={v => { setReassignUserId(v); setShowReassignDialog(true); }}><SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">Unassigned</SelectItem>{store.users.filter(u => u.id).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div><p className="text-xs text-muted-foreground mb-1">Due Date</p><div className="flex items-center gap-1 text-sm"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className={cn(overdue && 'text-rose-400 font-medium')}>{task.dueDate ? fmtDate(task.dueDate) : 'No date'}</span></div></div>
          </div>
          {task.teamName && <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">Team:</p><Badge variant="outline" className="border-cyan-500/20 text-cyan-400">{task.teamName}</Badge></div>}
          {task.isBlocked && <GlassCard className="p-3 border-rose-500/20" glow="rose"><div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" /><div className="flex-1"><p className="text-xs font-medium text-rose-400 mb-1">Blocked</p><p className="text-xs text-muted-foreground">{task.blockedReason || 'No reason provided'}</p><Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-1" onClick={handleResolveBlocker}><Unlock className="h-3 w-3" /> Resolve</Button></div></div></GlassCard>}
          <div>
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> Time ({timeData.totalHours.toFixed(1)}h)</p><Button size="sm" variant="ghost" className="h-6 text-[10px] text-cyan-400 gap-1" onClick={() => setShowTimeEntry(!showTimeEntry)}><Plus className="h-3 w-3" /> Log</Button></div>
            {showTimeEntry && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] mb-2 space-y-2"><div className="grid grid-cols-2 gap-2"><Input type="number" step="0.5" min="0.5" max="24" value={timeHours} onChange={e => setTimeHours(e.target.value)} placeholder="Hours" className="h-7 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /><Input type="date" value={timeDate} onChange={e => setTimeDate(e.target.value)} className="h-7 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div><Input value={timeNote} onChange={e => setTimeNote(e.target.value)} placeholder="Note" className="h-7 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTimeEntry(false)}>Cancel</Button><Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={handleAddTimeEntry}>Add</Button></div></motion.div>}
            {timeData.entries.length > 0 && <div className="space-y-1 max-h-24 overflow-y-auto">{timeData.entries.map((e, i) => <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-black/[0.03] dark:bg-white/[0.05]"><span className="text-muted-foreground">{e.date ? fmtDate(e.date) : '—'}</span><span className="font-medium">{e.hours}h</span></div>)}</div>}
          </div>
          <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Comments ({(task.comments || []).filter(c => !c.comment.startsWith('[TIME]')).length})</p>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">{(task.comments || []).filter(c => !c.comment.startsWith('[TIME]')).map(c => <div key={c.id} className="p-2 rounded bg-black/[0.03] dark:bg-white/[0.05]"><div className="flex items-center gap-1.5 mb-0.5"><Avatar className="h-4 w-4"><AvatarFallback className="text-[6px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{c.userName?.charAt(0) || '?'}</AvatarFallback></Avatar><span className="text-[10px] font-medium">{c.userName || 'Unknown'}</span><span className="text-[9px] text-muted-foreground">{fmtDate(c.createdAt)}</span></div><p className="text-xs text-muted-foreground pl-5">{c.comment}</p></div>)}</div>
            <div className="flex gap-2"><Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add comment..." className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" onKeyDown={e => e.key === 'Enter' && handleAddComment()} /><Button size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={handleAddComment} disabled={!commentText.trim()}><Send className="h-3 w-3" /></Button></div>
          </div>
          <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
          <div className="flex flex-wrap gap-2">
            {task.status === 'in-review' && <><Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowApproveDialog(true)}><Check className="h-3.5 w-3.5" /> Approve</Button><Button size="sm" variant="outline" className="gap-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={() => setShowChangesDialog(true)}><RotateCcw className="h-3.5 w-3.5" /> Request Changes</Button></>}
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={handleMoveNext}><ArrowUpCircle className="h-3.5 w-3.5" /> Move Next</Button>
            <Button size="sm" variant="outline" className="gap-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
          </div>
        </div>
      </SheetContent>
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}><DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]"><DialogHeader><DialogTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-emerald-400" /> Approve Task</DialogTitle></DialogHeader><div className="space-y-4 py-2"><div><p className="text-sm font-medium mb-2">Score: {approveScore}</p><Slider value={[approveScore]} onValueChange={v => setApproveScore(v[0])} min={1} max={100} step={1} /><div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 - Needs Improvement</span><span>100 - Exceptional</span></div></div><Textarea value={approveComment} onChange={e => setApproveComment(e.target.value)} placeholder="Optional comment..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" rows={2} /></div><DialogFooter><Button variant="ghost" onClick={() => setShowApproveDialog(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-500 gap-1" onClick={handleApproveTask}><Check className="h-4 w-4" /> Approve</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}><DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]"><DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-amber-400" /> Request Changes</DialogTitle></DialogHeader><div className="py-2"><Textarea value={changesComment} onChange={e => setChangesComment(e.target.value)} placeholder="Describe changes needed..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" rows={3} autoFocus /></div><DialogFooter><Button variant="ghost" onClick={() => setShowChangesDialog(false)}>Cancel</Button><Button className="bg-amber-600 hover:bg-amber-500 gap-1" onClick={handleRequestChanges} disabled={!changesComment.trim()}><RotateCcw className="h-4 w-4" /> Request</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}><DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]"><DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-cyan-400" /> Reassign</DialogTitle></DialogHeader><div className="space-y-4 py-2"><Select value={reassignUserId} onValueChange={setReassignUserId}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select assignee" /></SelectTrigger><SelectContent>{store.users.filter(u => u.id && u.id !== task.assigneeId).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select><Input value={reassignReason} onChange={e => setReassignReason(e.target.value)} placeholder="Reason (optional)" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div><DialogFooter><Button variant="ghost" onClick={() => setShowReassignDialog(false)}>Cancel</Button><Button className="bg-cyan-600 hover:bg-cyan-500 gap-1" onClick={handleReassign} disabled={!reassignUserId}><UserPlus className="h-4 w-4" /> Reassign</Button></DialogFooter></DialogContent></Dialog>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
export function ManagerTMSBoard() {
  const store = useEMSStore();
  const { user, tasks, users, teams: storeTeams, updateTask, deleteTask, createTask,
    managerTaskData, managerTaskLoading, loadManagerTaskData, bulkUpdateTasks, bulkDeleteTasks,
    approveTask, requestTaskChanges, reassignTask, resolveTaskBlocker } = store;

  useEffect(() => { loadManagerTaskData().catch(() => {}); }, [loadManagerTaskData]);

  // ─── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [showResolveBlockerDialog, setShowResolveBlockerDialog] = useState(false);
  const [resolveBlockerTaskId, setResolveBlockerTaskId] = useState('');
  const [resolveBlockerComment, setResolveBlockerComment] = useState('');
  // Report dialog state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('sprint');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // ─── Computed Data ──────────────────────────────────────────
  const deptTasks = useMemo(() => {
    const source = managerTaskData?.tasks || tasks;
    if (!user?.departmentId) return source;
    return source.filter(t => t.departmentId === user.departmentId);
  }, [tasks, managerTaskData, user]);

  const metrics = managerTaskData?.metrics;
  const reviewQueue = useMemo(() => deptTasks.filter(t => t.status === 'in-review'), [deptTasks]);
  const overdueTasks = useMemo(() => deptTasks.filter(isOverdue), [deptTasks]);
  const blockedTasks = useMemo(() => deptTasks.filter(t => t.isBlocked), [deptTasks]);

  const filtered = useMemo(() => {
    let r = deptTasks;
    if (search) r = r.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') r = r.filter(t => t.priority === priorityFilter);
    if (assigneeFilter !== 'all') r = r.filter(t => t.assigneeId === assigneeFilter);
    if (teamFilter !== 'all') r = r.filter(t => t.teamId === teamFilter);
    return r;
  }, [deptTasks, search, statusFilter, priorityFilter, assigneeFilter, teamFilter]);

  const sorted = useMemo(() => {
    const priO: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    const staO: Record<string, number> = { 'in-progress': 5, 'in-review': 4, 'todo': 3, 'blocked': 2, 'done': 1 };
    return [...filtered].sort((a, b) => {
      let c = 0;
      switch (sortKey) {
        case 'title': c = a.title.localeCompare(b.title); break;
        case 'priority': c = (priO[a.priority] || 0) - (priO[b.priority] || 0); break;
        case 'status': c = (staO[a.status] || 0) - (staO[b.status] || 0); break;
        case 'dueDate': c = (a.dueDate || 'zzz').localeCompare(b.dueDate || 'zzz'); break;
        case 'assigneeName': c = (a.assigneeName || 'zzz').localeCompare(b.assigneeName || 'zzz'); break;
        case 'teamName': c = (a.teamName || 'zzz').localeCompare(b.teamName || 'zzz'); break;
      }
      return sortDir === 'desc' ? -c : c;
    });
  }, [filtered, sortKey, sortDir]);

  // Workload data
  const workloadData = useMemo(() => {
    const map: Record<string, { name: string; total: number; todo: number; inProgress: number; done: number; hours: number }> = {};
    for (const t of deptTasks) {
      const aid = t.assigneeId || '_unassigned';
      if (!map[aid]) map[aid] = { name: t.assigneeName || 'Unassigned', total: 0, todo: 0, inProgress: 0, done: 0, hours: 0 };
      map[aid].total++;
      if (t.status === 'todo') map[aid].todo++;
      if (t.status === 'in-progress') map[aid].inProgress++;
      if (t.status === 'done') map[aid].done++;
      map[aid].hours += getTimeEntries(t).totalHours;
    }
    return Object.entries(map).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.total - a.total);
  }, [deptTasks]);

  // Analytics data
  const velocityData = useMemo(() => managerTaskData?.velocityData || [], [managerTaskData]);
  const statusDist = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of deptTasks) m[t.status] = (m[t.status] || 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name: name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()), value }));
  }, [deptTasks]);
  const priorityDist = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of deptTasks) m[t.priority] = (m[t.priority] || 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [deptTasks]);
  const assigneePerf = useMemo(() => workloadData.filter(w => w.id !== '_unassigned').slice(0, 8), [workloadData]);

  // Sprint health
  const sprintHealth = useMemo(() => {
    const total = metrics?.totalTasks || deptTasks.length;
    const done = metrics?.doneCount || deptTasks.filter(t => t.status === 'done').length;
    const pct = total > 0 ? (done / total) * 100 : 0;
    if (pct >= 60) return { label: 'On Track', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (pct >= 30) return { label: 'At Risk', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: 'Off Track', color: 'text-rose-400', bg: 'bg-rose-500/10' };
  }, [metrics, deptTasks]);

  // Pipeline data
  const pipeline = useMemo(() => [
    { label: 'To Do', count: metrics?.todoCount || deptTasks.filter(t => t.status === 'todo').length, color: 'bg-slate-400' },
    { label: 'In Progress', count: metrics?.inProgressCount || deptTasks.filter(t => t.status === 'in-progress').length, color: 'bg-amber-400' },
    { label: 'In Review', count: metrics?.inReviewCount || reviewQueue.length, color: 'bg-cyan-400' },
    { label: 'Done', count: metrics?.doneCount || deptTasks.filter(t => t.status === 'done').length, color: 'bg-emerald-400' },
  ], [metrics, deptTasks, reviewQueue]);

  // ─── Actions ────────────────────────────────────────────────
  const openDetail = useCallback((t: Task) => { store.setSelectedTaskId(t.id); store.setActiveView('task-detail'); }, [store]);
  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  const handleApprove = async (taskId: string) => { try { await approveTask(taskId, 80); toast.success('Task approved'); } catch { toast.error('Failed'); } };
  const handleRequestChanges = async (taskId: string) => { try { await requestTaskChanges(taskId, 'Changes requested by manager'); toast.success('Changes requested'); } catch { toast.error('Failed'); } };
  const handleReject = async (taskId: string) => { try { await requestTaskChanges(taskId, 'Rejected — needs rework'); toast.success('Task rejected'); } catch { toast.error('Failed'); } };
  const handleResolveBlocker = async () => { try { await resolveTaskBlocker(resolveBlockerTaskId, resolveBlockerComment || undefined); toast.success('Blocker resolved'); setShowResolveBlockerDialog(false); } catch { toast.error('Failed'); } };
  const handleBulkUpdate = async () => { try { const updates: Record<string, string> = {}; if (bulkStatus) updates.status = bulkStatus; if (bulkPriority) updates.priority = bulkPriority; if (bulkAssignee) updates.assigneeId = bulkAssignee; await bulkUpdateTasks(Array.from(selectedIds), updates); toast.success(`${selectedIds.size} tasks updated`); setSelectedIds(new Set()); setShowBulkUpdate(false); } catch { toast.error('Bulk update failed'); } };
  const handleBulkDelete = async () => { try { await bulkDeleteTasks(Array.from(selectedIds)); toast.success(`${selectedIds.size} tasks deleted`); setSelectedIds(new Set()); } catch { toast.error('Bulk delete failed'); } };

  const csvExport = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return;
    const hdr = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const blob = new Blob([hdr + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, []);

  const deptUsers = useMemo(() => {
    if (!user?.departmentId) return users;
    return users.filter(u => u.departmentId === user.departmentId);
  }, [users, user]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold"><span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Task Management</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{managerTaskData?.departmentName || user?.department || 'Department'} &middot; Enterprise TMS</p>
        </div>
        <div className="flex gap-2 items-center">
          {reviewQueue.length > 0 && <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}><Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-3 py-1 text-sm">{reviewQueue.length} In Review</Badge></motion.div>}
          <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => setCreateModalOpen(true)}><Plus className="h-4 w-4" /> Create Task</Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <TabsTrigger value="overview" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="board" className="text-xs gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Board</TabsTrigger>
            <TabsTrigger value="review" className="text-xs gap-1 relative"><Eye className="h-3.5 w-3.5" /> Review{reviewQueue.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 text-[9px] text-white flex items-center justify-center font-bold">{reviewQueue.length}</span>}</TabsTrigger>
            <TabsTrigger value="workload" className="text-xs gap-1"><Users className="h-3.5 w-3.5" /> Workload</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1"><TrendingUp className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Reports</TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ TAB 1: OVERVIEW ═══════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* 7 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard title="Total Tasks" value={metrics?.totalTasks || deptTasks.length} icon={ListTodo} color="emerald" subtitle="All tasks" hero progressRing={{ value: metrics?.totalTasks || deptTasks.length, max: (metrics?.totalTasks || deptTasks.length) + (metrics?.blockedCount || 0) }} />
            <StatCard title="In Progress" value={metrics?.inProgressCount || deptTasks.filter(t => t.status === 'in-progress').length} icon={Clock} color="amber" subtitle="Active" hero />
            <StatCard title="Completed" value={metrics?.completedThisWeek || deptTasks.filter(t => t.status === 'done').length} icon={CheckCircle2} color="emerald" subtitle="This week" hero trend={{ value: 12, label: 'vs last week' }} />
            <StatCard title="Overdue" value={metrics?.overdueCount || overdueTasks.length} icon={AlertTriangle} color="rose" subtitle="Past due" hero pulse={(metrics?.overdueCount || overdueTasks.length) > 0} />
            <StatCard title="In Review" value={metrics?.inReviewCount || reviewQueue.length} icon={Eye} color="cyan" subtitle="Awaiting review" hero />
            <StatCard title="Velocity" value={velocityData.length > 0 ? velocityData[velocityData.length - 1].completed : 0} icon={Zap} color="emerald" subtitle="Tasks/week" hero trend={{ value: 8, label: 'improving' }} />
            <StatCard title="Avg Time" value={`${metrics?.avgCompletionDays || 0}d`} icon={Timer} color="cyan" subtitle="Completion" hero />
          </div>

          {/* Task Pipeline */}
          <GlassCard className="p-5" glow="emerald">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ArrowRight className="h-4 w-4 text-emerald-400" /> Task Pipeline</h3>
            <div className="flex items-center gap-2">
              {pipeline.map((p, i) => (
                <div key={p.label} className="flex-1">
                  <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-medium text-muted-foreground">{p.label}</span><span className="text-xs font-bold">{p.count}</span></div>
                  <div className="h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden"><motion.div className={cn('h-full rounded-full', p.color)} initial={{ width: 0 }} animate={{ width: `${deptTasks.length > 0 ? (p.count / deptTasks.length) * 100 : 0}%` }} transition={{ duration: 0.6, delay: i * 0.1 }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold', sprintHealth.bg, sprintHealth.color)}>Sprint: {sprintHealth.label}</div>
              <span className="text-[10px] text-muted-foreground">{metrics?.doneCount || 0}/{metrics?.totalTasks || 0} completed ({deptTasks.length > 0 ? Math.round(((metrics?.doneCount || 0) / (metrics?.totalTasks || 1)) * 100) : 0}%)</span>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Review Queue */}
            <GlassCard className="p-5" glow="cyan">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Eye className="h-4 w-4 text-cyan-400" /> Review Queue</h3>
              {reviewQueue.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No tasks awaiting review</p> : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reviewQueue.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => openDetail(t)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5"><StatusBadge status={t.priority} /><span className="text-[10px] text-muted-foreground">{t.assigneeName || 'Unassigned'}</span></div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleApprove(t.id)} title="Approve"><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10" onClick={() => handleRequestChanges(t.id)} title="Request Changes"><RotateCcw className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Recent Activity */}
            <GlassCard className="p-5" glow="amber">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-amber-400" /> Recent Activity</h3>
              {(managerTaskData?.recentActivity?.length || 0) === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No recent activity</p> : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {(managerTaskData?.recentActivity || []).slice(0, 12).map((a, i) => (
                      <div key={a.taskId + i} className="flex items-start gap-2 text-xs py-1.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                        <div className={cn('h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', a.action === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : a.action === 'completed' ? 'bg-cyan-500/15 text-cyan-400' : a.action === 'created' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400')}>
                          {a.action === 'approved' ? <Check className="h-3 w-3" /> : a.action === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : a.action === 'created' ? <Plus className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0"><span className="font-medium">{a.taskTitle}</span> <span className="text-muted-foreground">— {a.action} by {a.userName}</span></div>
                        <span className="text-muted-foreground shrink-0">{timeAgo(a.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ TAB 2: TASK BOARD ═════════════════════════════════ */}
        <TabsContent value="board" className="space-y-3 mt-4">
          {/* Bulk Actions */}
          <AnimatePresence>{selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs font-medium text-emerald-400">{selectedIds.size} selected</span>
              <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => { setBulkStatus(''); setBulkPriority(''); setBulkAssignee(''); setShowBulkUpdate(true); }}>Bulk Update</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-400 hover:bg-rose-500/10" onClick={handleBulkDelete}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </motion.div>
          )}</AnimatePresence>

          {/* Filter Bar */}
          <GlassCard className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-48 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-28 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{statusFlow.map(s => <SelectItem key={s} value={s}>{s.replace('-', ' ')}</SelectItem>)}</SelectContent></Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-24 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Pri</SelectItem>{['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}><SelectTrigger className="w-32 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Assignee</SelectItem>{deptUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
              <Select value={teamFilter} onValueChange={setTeamFilter}><SelectTrigger className="w-28 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Team</SelectItem>{(storeTeams || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant={viewMode === 'kanban' ? 'default' : 'ghost'} className={`h-8 w-8 p-0 ${viewMode === 'kanban' ? 'bg-emerald-600' : ''}`} onClick={() => setViewMode('kanban')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button size="sm" variant={viewMode === 'list' ? 'default' : 'ghost'} className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-emerald-600' : ''}`} onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground ml-2">{sorted.length} tasks</span>
              </div>
            </div>
          </GlassCard>

          {/* Views */}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {kanbanCols.map(col => {
                const colTasks = sorted.filter(t => t.status === col.id);
                return (
                  <div key={col.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-1"><div className={cn('h-2 w-2 rounded-full', col.accent)} /><span className="text-xs font-semibold">{col.title}</span><span className="text-[10px] text-muted-foreground">{colTasks.length}</span></div>
                    <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                      {colTasks.map(t => <KanbanTaskCard key={t.id} task={t} selected={selectedIds.has(t.id)} onToggleSelect={() => toggleSelect(t.id)} onClick={() => openDetail(t)} onMoveNext={async () => { const nxt = nextStatusMap[t.status]; if (nxt) { try { await updateTask(t.id, { status: nxt }); toast.success(`Moved to ${nxt}`); } catch { toast.error('Failed'); } } }} onApprove={() => handleApprove(t.id)} onResolveBlocker={() => { setResolveBlockerTaskId(t.id); setShowResolveBlockerDialog(true); }} />)}
                      {colTasks.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">No tasks</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <GlassCard className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-black/[0.1] dark:border-white/[0.1]">
                  <th className="py-2 px-2 w-8"><Checkbox checked={selectedIds.size === sorted.length && sorted.length > 0} onCheckedChange={() => setSelectedIds(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(t => t.id)))} /></th>
                  {([['title', 'Title'], ['assigneeName', 'Assignee'], ['priority', 'Priority'], ['status', 'Status'], ['dueDate', 'Due']] as [SortKey, string][]).map(([k, l]) => <th key={k} className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground text-xs" onClick={() => toggleSort(k)}>{l} {SortIcon({ k })}</th>)}
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Team</th>
                  <th className="py-2 px-2 w-20" />
                </tr></thead>
                <tbody>
                  {sorted.map(t => { const ov = isOverdue(t); const td = getTimeEntries(t); return (
                    <tr key={t.id} onClick={() => openDetail(t)} className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer transition-colors">
                      <td className="py-2.5 px-2" onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} className="h-3.5 w-3.5 border-black/[0.15] dark:border-white/[0.3] data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600" /></td>
                      <td className="py-2.5 px-2 text-xs font-medium max-w-[200px] truncate">{t.title}</td>
                      <td className="py-2.5 px-2"><div className="flex items-center gap-1.5"><Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{t.assigneeName?.charAt(0) || '?'}</AvatarFallback></Avatar><span className="text-xs text-muted-foreground truncate max-w-[100px]">{t.assigneeName || '—'}</span></div></td>
                      <td className="py-2.5 px-2"><StatusBadge status={t.priority} /></td>
                      <td className="py-2.5 px-2"><StatusBadge status={t.status} /></td>
                      <td className={cn('py-2.5 px-2 text-xs', ov && 'text-rose-400 font-medium')}>{t.dueDate ? fmtDate(t.dueDate) : '—'}{ov && ' !'}</td>
                      <td className="py-2.5 px-2 text-xs text-muted-foreground">{t.teamName || '—'}</td>
                      <td className="py-2.5 px-2" onClick={e => e.stopPropagation()}><div className="flex gap-0.5">{t.status === 'in-review' && <><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleApprove(t.id)}><Check className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-amber-400 hover:bg-amber-500/10" onClick={() => handleRequestChanges(t.id)}><RotateCcw className="h-3.5 w-3.5" /></Button></>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-400 hover:bg-rose-500/10" onClick={async () => { try { await deleteTask(t.id); toast.success('Deleted'); } catch { toast.error('Failed'); } }}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                    </tr>
                  ); })}
                </tbody>
              </table>
              {sorted.length === 0 && <p className="text-center py-8 text-xs text-muted-foreground">No tasks found</p>}
            </GlassCard>
          )}
        </TabsContent>

        {/* ═══ TAB 3: MY REVIEW QUEUE ════════════════════════════ */}
        <TabsContent value="review" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-cyan-400" /> Tasks Awaiting Review <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">{reviewQueue.length}</Badge></h3>
            {selectedIds.size > 0 && <div className="flex items-center gap-2"><span className="text-xs text-emerald-400">{selectedIds.size} selected</span><Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 gap-1" onClick={async () => { for (const id of selectedIds) { try { await approveTask(id, 80); } catch {} } toast.success('Batch approved'); setSelectedIds(new Set()); }}><Check className="h-3 w-3" /> Batch Approve</Button><Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>Clear</Button></div>}
          </div>
          {reviewQueue.length === 0 ? <GlassCard className="p-8"><p className="text-xs text-muted-foreground text-center">No tasks awaiting review 🎉</p></GlassCard> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reviewQueue.map(t => {
                const timeSinceReview = t.status === 'in-review' && t.comments?.length ? timeAgo(t.comments[t.comments.length - 1].createdAt) : '—';
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="p-4" hover>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2"><Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} className="h-3.5 w-3.5 border-black/[0.15] dark:border-white/[0.3] data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600" /><p className="text-sm font-medium cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => openDetail(t)}>{t.title}</p></div>
                        <Badge variant="outline" className="text-[9px] shrink-0 border-cyan-500/20 text-cyan-400 bg-cyan-500/10">{timeSinceReview}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <StatusBadge status={t.priority} />
                        <div className="flex items-center gap-1"><Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{t.assigneeName?.charAt(0) || '?'}</AvatarFallback></Avatar><span className="text-[10px] text-muted-foreground">{t.assigneeName || 'Unassigned'}</span></div>
                        {t.dueDate && <span className="text-[10px] text-muted-foreground"><Clock className="h-3 w-3 inline" /> {fmtDate(t.dueDate)}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-[10px] gap-1 flex-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleApprove(t.id)}><Check className="h-3 w-3" /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 flex-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={() => handleRequestChanges(t.id)}><RotateCcw className="h-3 w-3" /> Changes</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 flex-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10" onClick={() => handleReject(t.id)}><X className="h-3 w-3" /> Reject</Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
          {/* Review History */}
          <GlassCard className="p-5" glow="emerald">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Review History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(managerTaskData?.recentActivity || []).filter(a => a.action === 'approved' || a.action === 'changes-requested').length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No review history</p> :
                (managerTaskData?.recentActivity || []).filter(a => a.action === 'approved' || a.action === 'changes-requested').map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                    <div className={cn('h-5 w-5 rounded-full flex items-center justify-center shrink-0', a.action === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
                      {a.action === 'approved' ? <Check className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                    </div>
                    <span className="font-medium">{a.taskTitle}</span>
                    <span className="text-muted-foreground">— {a.action} by {a.userName}</span>
                    <span className="text-muted-foreground ml-auto">{timeAgo(a.timestamp)}</span>
                  </div>
                ))
              }
            </div>
          </GlassCard>
        </TabsContent>

        {/* ═══ TAB 4: WORKLOAD & RESOURCES ═══════════════════════ */}
        <TabsContent value="workload" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Team Size" value={metrics?.teamSize || deptUsers.length} icon={Users} color="emerald" subtitle="Members" hero />
            <StatCard title="Total Tasks" value={deptTasks.length} icon={ListTodo} color="cyan" subtitle="Department" hero />
            <StatCard title="Overloaded" value={workloadData.filter(w => w.total > 5).length} icon={AlertTriangle} color="rose" subtitle=">5 tasks" hero pulse={workloadData.filter(w => w.total > 5).length > 0} />
            <StatCard title="Available" value={Math.max(0, deptUsers.length - workloadData.filter(w => w.total > 5).length)} icon={UserCheck} color="emerald" subtitle="Capacity" hero />
          </div>

          {/* Workload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workloadData.map(w => {
              const isOverloaded = w.total > 5;
              const pct = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
              return (
                <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <GlassCard className={cn('p-4', isOverloaded && 'border-rose-500/20')} hover glow={isOverloaded ? 'rose' : 'emerald'}>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{w.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground">{w.total} tasks &middot; {w.hours.toFixed(1)}h logged</p>
                      </div>
                      {isOverloaded && <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[9px]"><AlertTriangle className="h-3 w-3 mr-1" />Overloaded</Badge>}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] mb-2">
                      <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded p-1.5"><p className="font-bold text-slate-400">{w.todo}</p><p className="text-muted-foreground">Todo</p></div>
                      <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded p-1.5"><p className="font-bold text-amber-400">{w.inProgress}</p><p className="text-muted-foreground">Active</p></div>
                      <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded p-1.5"><p className="font-bold text-emerald-400">{w.done}</p><p className="text-muted-foreground">Done</p></div>
                      <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded p-1.5"><p className="font-bold text-cyan-400">{pct}%</p><p className="text-muted-foreground">Rate</p></div>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-emerald-500 [&>[data-slot=indicator]]:to-cyan-500" />
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* Workload Balance Chart */}
          <GlassCard className="p-5" glow="cyan">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Workload Balance</h3>
            {workloadData.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No workload data</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={workloadData.slice(0, 10)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="todo" stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} name="Todo" />
                  <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
                  <Bar dataKey="done" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Done" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Resource Suggestions */}
          <GlassCard className="p-5" glow="emerald">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-400" /> Resource Suggestions</h3>
            <div className="space-y-2">
              {workloadData.filter(w => w.total > 5).map(w => (
                <div key={w.id} className="flex items-center gap-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-xs"><AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" /><span className="font-medium text-rose-400">{w.name}</span><span className="text-muted-foreground">has {w.total} tasks — consider redistributing</span></div>
              ))}
              {workloadData.filter(w => w.total <= 2 && w.id !== '_unassigned').map(w => (
                <div key={w.id} className="flex items-center gap-2 p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-xs"><UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" /><span className="font-medium text-emerald-400">{w.name}</span><span className="text-muted-foreground">has capacity for more tasks ({w.total} assigned)</span></div>
              ))}
              {workloadData.filter(w => w.total > 5).length === 0 && workloadData.filter(w => w.total <= 2 && w.id !== '_unassigned').length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Team workload is balanced</p>}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ═══ TAB 5: ANALYTICS ══════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Task Analytics</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10" onClick={() => csvExport(deptTasks.map(t => ({ Title: t.title, Status: t.status, Priority: t.priority, Assignee: t.assigneeName || '', Team: t.teamName || '', DueDate: t.dueDate || '', Created: t.createdAt })), `tasks-analytics-${Date.now()}.csv`)}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Velocity Chart */}
            <GlassCard className="p-5" glow="emerald">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Task Velocity</h4>
              {velocityData.length === 0 ? <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No velocity data</div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={velocityData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="created" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Created" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2"><div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed</div><div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Created</div></div>
            </GlassCard>

            {/* Status Distribution */}
            <GlassCard className="p-5" glow="cyan">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status Distribution</h4>
              {statusDist.length === 0 ? <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No data</div> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart><Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">{statusDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} /></PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">{statusDist.map((d, i) => <div key={d.name} className="flex items-center gap-2 text-xs"><div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-muted-foreground">{d.name}</span><span className="font-medium ml-auto">{d.value}</span></div>)}</div>
                </div>
              )}
            </GlassCard>

            {/* Priority Breakdown */}
            <GlassCard className="p-5" glow="amber">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Priority Breakdown</h4>
              <div className="space-y-3">
                {priorityDist.map((p, i) => {
                  const colors = ['bg-slate-400', 'bg-cyan-400', 'bg-amber-400', 'bg-rose-400'];
                  const textColors = ['text-slate-400', 'text-cyan-400', 'text-amber-400', 'text-rose-400'];
                  const pct = deptTasks.length > 0 ? Math.round((p.value / deptTasks.length) * 100) : 0;
                  return <div key={p.name} className="space-y-1"><div className="flex justify-between text-xs"><span className={cn('font-medium', textColors[i])}>{p.name}</span><span className="text-muted-foreground">{p.value} ({pct}%)</span></div><Progress value={pct} className="h-2 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-emerald-500 [&>[data-slot=indicator]]:to-cyan-500" /></div>;
                })}
              </div>
            </GlassCard>

            {/* Assignee Performance */}
            <GlassCard className="p-5" glow="emerald">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignee Performance</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assigneePerf.map(a => {
                  const rate = a.total > 0 ? Math.round((a.done / a.total) * 100) : 0;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[9px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{a.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{a.name}</p><div className="flex items-center gap-2 mt-0.5"><Progress value={rate} className="h-1 flex-1 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=indicator]]:bg-emerald-500" /><span className="text-[10px] text-muted-foreground">{a.done}/{a.total}</span></div></div>
                      <span className={cn('text-xs font-bold', rate >= 70 ? 'text-emerald-400' : rate >= 40 ? 'text-amber-400' : 'text-rose-400')}>{rate}%</span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Burndown Concept */}
            <GlassCard className="p-5" glow="rose">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Burndown (Tasks Remaining)</h4>
              {velocityData.length === 0 ? <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No data</div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={velocityData.map((v, i) => { const total = velocityData.slice(0, i + 1).reduce((s, x) => s + x.created, 0); const done = velocityData.slice(0, i + 1).reduce((s, x) => s + x.completed, 0); return { week: v.week, remaining: total - done }; })} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="remaining" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 3 }} name="Remaining" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </GlassCard>

            {/* Blocked Tasks Analysis */}
            <GlassCard className="p-5" glow="amber">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Blocked Tasks</h4>
              {blockedTasks.length === 0 ? <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">No blocked tasks 🎉</div> : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {blockedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 cursor-pointer hover:bg-rose-500/10 transition-colors" onClick={() => openDetail(t)}>
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{t.title}</p><p className="text-[10px] text-muted-foreground">{t.blockedReason || 'No reason'}</p></div>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10 shrink-0" onClick={e => { e.stopPropagation(); setResolveBlockerTaskId(t.id); setShowResolveBlockerDialog(true); }}>Resolve</Button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ TAB 6: REPORTS ════════════════════════════════════ */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Generate Report */}
            <GlassCard className="p-5" glow="emerald">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-400" /> Generate Report</h3>
              <div className="space-y-3">
                <div><p className="text-xs text-muted-foreground mb-1">Report Type</p><Select value={reportType} onValueChange={setReportType}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sprint">Sprint Summary</SelectItem><SelectItem value="individual">Individual Performance</SelectItem><SelectItem value="velocity">Team Velocity</SelectItem><SelectItem value="task">Task Report</SelectItem></SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-2"><div><p className="text-xs text-muted-foreground mb-1">From</p><Input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div><div><p className="text-xs text-muted-foreground mb-1">To</p><Input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div></div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 gap-1" onClick={() => { csvExport(deptTasks.map(t => ({ Title: t.title, Status: t.status, Priority: t.priority, Assignee: t.assigneeName || '', Team: t.teamName || '', DueDate: t.dueDate || '', Created: t.createdAt, Score: t.performanceScore || '' })), `${reportType}-report-${Date.now()}.csv`); toast.success(`${reportType} report generated`); }}><Download className="h-4 w-4" /> Generate & Export</Button>
              </div>
            </GlassCard>

            {/* Report Templates */}
            <GlassCard className="p-5" glow="cyan">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Report Templates</h3>
              <div className="space-y-2">
                {[
                  { name: 'Sprint Summary', desc: 'Current sprint progress and metrics', icon: Zap, color: 'emerald' },
                  { name: 'Individual Performance', desc: 'Per-member task completion and scores', icon: Users, color: 'cyan' },
                  { name: 'Team Velocity', desc: 'Weekly task completion trends', icon: TrendingUp, color: 'amber' },
                  { name: 'Blocked Tasks Analysis', desc: 'Blockers and resolution patterns', icon: AlertTriangle, color: 'rose' },
                ].map(r => (
                  <div key={r.name} className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => { setReportType(r.name.toLowerCase().split(' ')[0]); setReportOpen(true); }}>
                    <div className={cn('rounded-lg p-2 shrink-0', r.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : r.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' : r.color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400')}><r.icon className="h-4 w-4" /></div>
                    <div className="flex-1"><p className="text-xs font-medium">{r.name}</p><p className="text-[10px] text-muted-foreground">{r.desc}</p></div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-5" glow="amber">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" /> Sprint Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-xl font-bold text-emerald-400">{metrics?.completedThisWeek || 0}</p><p className="text-[10px] text-muted-foreground">Completed This Week</p></div>
                <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-xl font-bold text-cyan-400">{metrics?.avgCompletionDays || 0}d</p><p className="text-[10px] text-muted-foreground">Avg Completion Time</p></div>
                <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-xl font-bold text-amber-400">{metrics?.inProgressCount || 0}</p><p className="text-[10px] text-muted-foreground">Currently Active</p></div>
                <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-xl font-bold text-rose-400">{metrics?.overdueCount || 0}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div>
              </div>
            </GlassCard>

            {/* Scheduled Reports (Placeholder) */}
            <GlassCard className="p-5" glow="rose">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-rose-400" /> Scheduled Reports</h3>
              <div className="space-y-2">
                {[
                  { name: 'Weekly Sprint Report', schedule: 'Every Monday 9:00 AM', active: true },
                  { name: 'Monthly Team Velocity', schedule: '1st of each month', active: true },
                  { name: 'Overdue Tasks Alert', schedule: 'Daily 8:00 AM', active: false },
                ].map(r => (
                  <div key={r.name} className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]">
                    <div><p className="text-xs font-medium">{r.name}</p><p className="text-[10px] text-muted-foreground">{r.schedule}</p></div>
                    <Badge variant="outline" className={cn('text-[9px]', r.active ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-500/30 text-slate-400')}>{r.active ? 'Active' : 'Paused'}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">Scheduled reports are coming soon</p>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Shared Dialogs ═════════════════════════════════════ */}
      <TaskDetailSheet task={selectedTask} open={detailOpen} onOpenChange={setDetailOpen} />
      {createModalOpen && <CreateTaskModal open={createModalOpen} onOpenChange={setCreateModalOpen} />}

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkUpdate} onOpenChange={setShowBulkUpdate}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-cyan-400" /> Bulk Update ({selectedIds.size} tasks)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Change status..." /></SelectTrigger><SelectContent><SelectItem value="_none">— No change —</SelectItem>{statusFlow.map(s => <SelectItem key={s} value={s}>{s.replace('-', ' ')}</SelectItem>)}</SelectContent></Select>
            <Select value={bulkPriority} onValueChange={setBulkPriority}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Change priority..." /></SelectTrigger><SelectContent><SelectItem value="_none">— No change —</SelectItem>{['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            <Select value={bulkAssignee} onValueChange={setBulkAssignee}><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Reassign to..." /></SelectTrigger><SelectContent><SelectItem value="_none">— No change —</SelectItem>{deptUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setShowBulkUpdate(false)}>Cancel</Button><Button className="bg-cyan-600 hover:bg-cyan-500 gap-1" onClick={handleBulkUpdate}><Zap className="h-4 w-4" /> Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Blocker Dialog */}
      <Dialog open={showResolveBlockerDialog} onOpenChange={setShowResolveBlockerDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Unlock className="h-5 w-5 text-amber-400" /> Resolve Blocker</DialogTitle></DialogHeader>
          <div className="py-2"><Textarea value={resolveBlockerComment} onChange={e => setResolveBlockerComment(e.target.value)} placeholder="How was the blocker resolved?" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" rows={3} /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setShowResolveBlockerDialog(false)}>Cancel</Button><Button className="bg-amber-600 hover:bg-amber-500 gap-1" onClick={handleResolveBlocker}><Unlock className="h-4 w-4" /> Resolve</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-400" /> {reportType === 'sprint' ? 'Sprint Summary' : reportType === 'individual' ? 'Individual Performance' : reportType === 'velocity' ? 'Team Velocity' : 'Task'} Report</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-lg font-bold text-emerald-400">{metrics?.totalTasks || 0}</p><p className="text-[10px] text-muted-foreground">Total Tasks</p></div>
              <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-lg font-bold text-cyan-400">{metrics?.completedThisWeek || 0}</p><p className="text-[10px] text-muted-foreground">Completed</p></div>
              <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-lg p-3 text-center"><p className="text-lg font-bold text-amber-400">{metrics?.avgCompletionDays || 0}d</p><p className="text-[10px] text-muted-foreground">Avg Time</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-xs text-muted-foreground mb-1">From</p><Input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              <div><p className="text-xs text-muted-foreground mb-1">To</p><Input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Close</Button>
            <Button variant="outline" className="gap-1 border-black/[0.1] dark:border-white/[0.1]" onClick={() => { csvExport(deptTasks.map(t => ({ Title: t.title, Status: t.status, Priority: t.priority, Assignee: t.assigneeName || '', DueDate: t.dueDate || '' })), `report-${Date.now()}.csv`); }}><Download className="h-4 w-4" /> CSV</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500 gap-1" onClick={() => { window.print(); toast.success('Print dialog opened'); }}><FileText className="h-4 w-4" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
