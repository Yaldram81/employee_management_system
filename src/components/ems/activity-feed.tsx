'use client';

import { useState, useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CalendarDays, ListTodo, AlertCircle,
  CheckCircle2, UserPlus, Zap, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { timeAgo, getInitials } from './shared';

type FeedFilter = 'all' | 'attendance' | 'leave' | 'tasks';
type FeedMode = 'compact' | 'full';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  text: string;
  description?: string;
  time: string;
  color: string;
  type: 'attendance' | 'leave' | 'tasks' | 'complaints' | 'approval';
  userName: string;
}

const FILTER_TABS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'leave', label: 'Leave' },
  { value: 'tasks', label: 'Tasks' },
];

const TYPE_COLORS: Record<string, string> = {
  attendance: 'text-emerald-400',
  leave: 'text-amber-400',
  tasks: 'text-cyan-400',
  complaints: 'text-rose-400',
  approval: 'text-amber-400',
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  attendance: CheckCircle2,
  leave: CalendarDays,
  tasks: ListTodo,
  complaints: AlertCircle,
  approval: UserPlus,
};

interface ActivityFeedProps {
  mode?: FeedMode;
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({ mode = 'full', maxItems, className }: ActivityFeedProps) {
  const { attendance, leaves, tasks, complaints, requests } = useEMSStore();
  const [filter, setFilter] = useState<FeedFilter>('all');

  const today = new Date().toISOString().split('T')[0];

  const allItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Attendance clock-ins
    attendance
      .filter(a => a.date === today)
      .forEach(a => {
        items.push({
          id: `att-${a.id}`,
          icon: CheckCircle2,
          text: `${a.userName || 'Someone'} clocked in`,
          description: mode === 'full' ? `Status: ${a.status}` : undefined,
          time: a.clockIn || a.firstIn || a.createdAt || today,
          color: TYPE_COLORS.attendance,
          type: 'attendance',
          userName: a.userName || 'Unknown',
        });
      });

    // Leave requests
    leaves
      .slice()
      .reverse()
      .forEach(l => {
        items.push({
          id: `leave-${l.id}`,
          icon: CalendarDays,
          text: `${l.userName || 'Someone'} requested ${l.type} leave`,
          description: mode === 'full' ? `${l.startDate} → ${l.endDate}` : undefined,
          time: l.createdAt || today,
          color: TYPE_COLORS.leave,
          type: 'leave',
          userName: l.userName || 'Unknown',
        });
      });

    // Task completions
    tasks
      .filter(t => t.status === 'done')
      .forEach(t => {
        items.push({
          id: `task-${t.id}`,
          icon: ListTodo,
          text: `${t.assigneeName || 'Someone'} completed "${t.title}"`,
          description: mode === 'full' ? `Priority: ${t.priority}` : undefined,
          time: t.completedAt || t.createdAt || today,
          color: TYPE_COLORS.tasks,
          type: 'tasks',
          userName: t.assigneeName || 'Unknown',
        });
      });

    // Complaints
    complaints
      .filter(c => c.status === 'open')
      .forEach(c => {
        items.push({
          id: `comp-${c.id}`,
          icon: AlertCircle,
          text: `${c.isAnonymous ? 'Anonymous' : c.userName} filed: ${c.subject}`,
          description: mode === 'full' ? c.description?.slice(0, 60) : undefined,
          time: c.createdAt || today,
          color: TYPE_COLORS.complaints,
          type: 'complaints',
          userName: c.isAnonymous ? 'Anonymous' : (c.userName || 'Unknown'),
        });
      });

    // Approvals
    requests
      .filter(r => r.status === 'pending')
      .forEach(r => {
        items.push({
          id: `req-${r.id}`,
          icon: UserPlus,
          text: `${r.userName || 'Someone'} — ${r.title || r.type} request`,
          description: mode === 'full' ? `Type: ${r.type}` : undefined,
          time: r.createdAt || today,
          color: TYPE_COLORS.approval,
          type: 'approval',
          userName: r.userName || 'Unknown',
        });
      });

    // Sort by most recent first
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return items;
  }, [attendance, leaves, tasks, complaints, requests, today, mode]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? allItems : allItems.filter(i => i.type === filter);
    return maxItems ? list.slice(0, maxItems) : list;
  }, [allItems, filter, maxItems]);

  const limit = maxItems || (mode === 'compact' ? 4 : 8);

  return (
    <GlassCard className={className} glow={filtered.length > 0 ? 'amber' : 'none'}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Live Activity Feed
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-medium text-emerald-400">Live</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed Items */}
        <div className={`space-y-1.5 ${mode === 'full' ? 'max-h-72' : 'max-h-44'} overflow-y-auto`}>
          <AnimatePresence mode="popLayout">
            {filtered.slice(0, limit).map((item, i) => {
              const Icon = TYPE_ICONS[item.type] || CheckCircle2;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {mode === 'full' ? (
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-600/60 to-cyan-600/60 text-white text-[9px] font-bold">
                          {getInitials(item.userName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate leading-tight">{item.text}</p>
                    {mode === 'full' && item.description && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1 mt-0.5">
                    {mode === 'full' && (
                      <Icon className={`h-3 w-3 ${item.color}`} />
                    )}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {timeAgo(item.time)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Clock className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>

        {/* View All Link */}
        {filtered.length > limit && (
          <div className="flex items-center justify-center pt-1">
            <button className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
