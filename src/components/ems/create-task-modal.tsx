'use client';

import { useState, useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import {
  Plus, Loader2, Rocket, FileText, Calendar, User,
  Tag, FolderKanban, Users, Link2, AlertTriangle, CheckCircle2,
} from 'lucide-react';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill parent task for sub-task creation */
  parentTaskId?: string;
  /** Pre-fill team */
  defaultTeamId?: string;
}

export function CreateTaskModal({ open, onOpenChange, parentTaskId, defaultTeamId }: CreateTaskModalProps) {
  const { user, users, departments, tasks, teams: storeTeams, createTask } = useEMSStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    assigneeId: 'none',
    teamId: defaultTeamId || 'none',
    dueDate: '',
    parentTaskId: parentTaskId || 'none',
    departmentId: user?.departmentId || 'none',
    isEpic: false,
  });

  // ─── Available Assignees ──────────────────────────────────
  const assignees = useMemo(() => {
    if (form.departmentId && form.departmentId !== 'none') {
      return users.filter(u => u.departmentId === form.departmentId);
    }
    return users;
  }, [users, form.departmentId]);

  // ─── Parent Task Options (non-done tasks) ─────────────────
  const parentTaskOptions = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && !t.parentTaskId);
  }, [tasks]);

  // ─── Team Options (from store teams + tasks with teamId) ──
  const teamOptions = useMemo(() => {
    const teams: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    // First, add teams from the store (API-backed)
    storeTeams.forEach(t => {
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        teams.push({ id: t.id, name: t.name || t.id });
      }
    });

    // Then, add any teams derived from tasks (fallback)
    tasks.forEach(t => {
      if (t.teamId && !seen.has(t.teamId)) {
        seen.add(t.teamId);
        teams.push({ id: t.teamId, name: t.teamName || t.teamId });
      }
    });
    return teams;
  }, [storeTeams, tasks]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData: Omit<Task, 'id' | 'createdAt'> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId === 'none' ? undefined : form.assigneeId,
        assigneeName: form.assigneeId && form.assigneeId !== 'none' ? users.find(u => u.id === form.assigneeId)?.name : undefined,
        reporterId: user?.id || '',
        reporterName: user?.name || '',
        departmentId: form.departmentId === 'none' ? undefined : form.departmentId,
        teamId: form.teamId === 'none' ? undefined : form.teamId,
        teamName: form.teamId && form.teamId !== 'none' ? teamOptions.find(t => t.id === form.teamId)?.name : undefined,
        parentTaskId: form.parentTaskId === 'none' ? undefined : form.parentTaskId,
        isBlocked: false,
        dueDate: form.dueDate || undefined,
      };

      await createTask(taskData);
      toast.success(form.isEpic ? 'Epic created successfully' : 'Task created successfully');
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'none',
      teamId: defaultTeamId || 'none',
      dueDate: '',
      parentTaskId: parentTaskId || 'none',
      departmentId: user?.departmentId || 'none',
      isEpic: false,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  // ─── Status options ───────────────────────────────────────
  const statusOptions: { value: Task['status']; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'in-review', label: 'In Review' },
    { value: 'done', label: 'Done' },
    { value: 'blocked', label: 'Blocked' },
  ];

  const priorityOptions: { value: Task['priority']; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-slate-400' },
    { value: 'medium', label: 'Medium', color: 'text-cyan-400' },
    { value: 'high', label: 'High', color: 'text-amber-400' },
    { value: 'urgent', label: 'Urgent', color: 'text-rose-400' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-strong border-white/20 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg p-2 bg-emerald-500/10">
              <Plus className="h-4 w-4 text-emerald-400" />
            </div>
            {form.isEpic ? 'Create Epic' : 'Create Task'}
          </DialogTitle>
          <DialogDescription>
            {form.isEpic
              ? 'Epics are large bodies of work that can be broken down into smaller tasks.'
              : 'Fill in the details to create a new task. Fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Epic Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-sm font-medium">Create as Epic</p>
                <p className="text-xs text-muted-foreground">Epics group related tasks together</p>
              </div>
            </div>
            <Switch
              checked={form.isEpic}
              onCheckedChange={(checked) => setForm({ ...form, isEpic: checked })}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              Title <span className="text-rose-400">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={form.isEpic ? 'Epic title...' : 'Task title...'}
              className="bg-white/5 border-white/10 focus:border-emerald-500/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the task in detail..."
              className="bg-white/5 border-white/10 min-h-[80px] focus:border-emerald-500/30"
            />
          </div>

          {/* Status + Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                Status
              </Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Task['status'] })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                Priority
              </Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task['priority'] })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Assignee + Department Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Assignee
              </Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assignees.filter(u => u.id).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                Department
              </Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v, assigneeId: 'none' })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.filter(d => d.id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team + Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Team
              </Label>
              <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teamOptions.filter(t => t.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Due Date
              </Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="bg-white/5 border-white/10 focus:border-emerald-500/30"
              />
            </div>
          </div>

          {/* Parent Task Selector */}
          {!form.isEpic && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                Parent Task
                <span className="text-xs text-muted-foreground ml-1">(for sub-tasks)</span>
              </Label>
              <Select value={form.parentTaskId} onValueChange={(v) => setForm({ ...form, parentTaskId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select parent task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent</SelectItem>
                  {parentTaskOptions.filter(t => t.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="truncate max-w-[250px] block">{t.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary Preview */}
          {form.title && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-white/5 border border-white/5"
            >
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{form.title}</span>
                {form.isEpic && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">Epic</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  form.priority === 'urgent' ? "border-rose-500/30 text-rose-400" :
                  form.priority === 'high' ? "border-amber-500/30 text-amber-400" :
                  form.priority === 'medium' ? "border-cyan-500/30 text-cyan-400" :
                  "border-slate-500/30 text-slate-400"
                )}>
                  {form.priority}
                </Badge>
                {form.assigneeId && (
                  <span className="text-xs text-muted-foreground">
                    → {users.find(u => u.id === form.assigneeId)?.name}
                  </span>
                )}
                {form.dueDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {form.dueDate}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="border-white/10">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-500"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {form.isEpic ? 'Create Epic' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
