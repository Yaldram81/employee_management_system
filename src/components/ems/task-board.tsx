'use client';

import { useState, useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, GripVertical, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '@/lib/types';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const columns: { id: Task['status']; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'border-slate-400' },
  { id: 'in-progress', title: 'In Progress', color: 'border-amber-400' },
  { id: 'in-review', title: 'In Review', color: 'border-cyan-400' },
  { id: 'done', title: 'Done', color: 'border-emerald-400' },
];

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <GlassCard className="p-3 mb-2 cursor-grab active:cursor-grabbing" hover>
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="mt-1 cursor-grab text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={task.priority} />
              {task.dueDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {task.dueDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">
                  {task.assigneeName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground">{task.assigneeName}</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export function TaskBoard() {
  const { user, tasks, users, createTask, updateTask, departments } = useEMSStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    departmentId: user?.departmentId || '',
  });

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col) => {
      map[col.id] = tasks.filter((t) => t.status === col.id);
    });
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // No intermediate updates needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column
    let targetStatus: Task['status'] | null = null;

    // Check if dropped on a column
    for (const col of columns) {
      if (over.id === col.id) {
        targetStatus = col.id;
        break;
      }
    }

    // Check if dropped on another task
    if (!targetStatus) {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== task.status) {
      try {
        await updateTask(taskId, { status: targetStatus });
        toast.success(`Task moved to ${targetStatus.replace('-', ' ')}`);
      } catch {
        toast.error('Failed to move task');
      }
    }
  };

  const handleCreateTask = async () => {
    if (!form.title) {
      toast.error('Task title is required');
      return;
    }
    try {
      await createTask({
        title: form.title,
        description: form.description,
        assigneeId: form.assigneeId || user!.id,
        reporterId: user!.id,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        departmentId: form.departmentId,
        status: 'todo',
        isBlocked: false,
      });
      toast.success('Task created');
      setDialogOpen(false);
      setForm({ title: '', description: '', assigneeId: '', priority: 'medium', dueDate: '', departmentId: user?.departmentId || '' });
    } catch {
      toast.error('Failed to create task');
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Board</h2>
        {isManagerOrAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Task title..."
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the task..."
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task['priority'] })}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.id).map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
                <Button onClick={handleCreateTask} className="w-full bg-emerald-600 hover:bg-emerald-500">
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px]">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col">
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
                <span className="font-medium text-sm">{col.title}</span>
                <span className="text-xs text-muted-foreground bg-black/[0.06] dark:bg-white/[0.1] rounded-full px-2 py-0.5">
                  {tasksByColumn[col.id]?.length || 0}
                </span>
              </div>
              <SortableContext
                items={tasksByColumn[col.id]?.map((t) => t.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <ScrollArea className="flex-1 max-h-[600px]">
                  <div className="space-y-0 min-h-[100px] p-1 rounded-lg bg-black/[0.01] dark:bg-white/[0.02]">
                    {tasksByColumn[col.id]?.map((task) => (
                      <SortableTaskCard key={task.id} task={task} />
                    ))}
                    {(!tasksByColumn[col.id] || tasksByColumn[col.id].length === 0) && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SortableContext>
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <GlassCard className="p-3 w-64 shadow-2xl bg-slate-800/90">
              <p className="text-sm font-medium">{activeTask.title}</p>
              <StatusBadge status={activeTask.priority} />
            </GlassCard>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
