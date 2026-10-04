'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEMSStore } from '@/lib/store';
import type { ActiveView, NotificationActionData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Clock,
  ShieldCheck,
  CalendarCheck,
  Palmtree,
  ListTodo,
  MessageSquareWarning,
  Info,
  ExternalLink,
  BellOff,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  ScrollText,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Moon,
  Loader2,
} from 'lucide-react';
import { timeAgo } from './shared/utils';

// ─── Type → Icon mapping ───────────────────────────────────────
const typeIcons: Record<string, React.ElementType> = {
  'approval-required': ShieldCheck,
  'attendance': CalendarCheck,
  'leave-update': Palmtree,
  'task-assigned': ListTodo,
  'complaint-update': MessageSquareWarning,
  'general': Info,
  'info': Info,
  'success': ShieldCheck,
  'warning': MessageSquareWarning,
  'error': MessageSquareWarning,
};

// ─── Type → Color mapping (emerald/amber/rose/cyan theme) ──────
const typeColors: Record<string, { icon: string; bg: string; border: string; dot: string }> = {
  'approval-required': { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  'attendance':        { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  'leave-update':      { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  'task-assigned':     { icon: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
  'complaint-update':  { icon: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' },
  'general':           { icon: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400' },
  'info':              { icon: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
  'success':           { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  'warning':           { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  'error':             { icon: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' },
};

// ─── Type → label ───────────────────────────────────────────────
const typeLabels: Record<string, string> = {
  'approval-required': 'Approval',
  'attendance': 'Attendance',
  'leave-update': 'Leave',
  'task-assigned': 'Task',
  'complaint-update': 'Complaint',
  'general': 'General',
  'info': 'Info',
  'success': 'Success',
  'warning': 'Warning',
  'error': 'Error',
};

// ─── Notification item animation variants ───────────────────────
const itemVariants = {
  initial: { opacity: 0, x: 40, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -40, scale: 0.9, transition: { duration: 0.3 } },
};

// ─── Priority dot size mapping ──────────────────────────────────
const priorityDotSize: Record<string, string> = {
  'urgent': 'h-3 w-3',
  'high': 'h-2.5 w-2.5',
  'medium': 'h-2 w-2',
  'low': 'h-1.5 w-1.5',
};

// ─── Filter tab type ────────────────────────────────────────────
type FilterTab = 'all' | 'unread' | 'mentions' | 'approvals' | 'tasks' | 'alerts';

const categoryFilterMap: Record<string, string[]> = {
  all: [],
  unread: [],
  mentions: [],
  approvals: ['approval-required', 'leave-update'],
  tasks: ['task-assigned'],
  alerts: ['complaint-update', 'warning', 'error'],
};

const tabLabels: Record<FilterTab, string> = {
  all: 'All',
  unread: 'Unread',
  mentions: 'Mentions',
  approvals: 'Approvals',
  tasks: 'Tasks',
  alerts: 'Alerts',
};

const ITEMS_PER_PAGE = 8;

// ─── Smart grouping chip config ─────────────────────────────────
const groupChipConfig: Record<string, { label: string; icon: React.ElementType; chipBg: string; chipText: string; chipBorder: string }> = {
  'leave-update':      { label: 'Leaves',   icon: Palmtree,            chipBg: 'bg-amber-500/15',  chipText: 'text-amber-400',  chipBorder: 'border-amber-500/30' },
  'task-assigned':     { label: 'Tasks',    icon: ListTodo,            chipBg: 'bg-cyan-500/15',   chipText: 'text-cyan-400',   chipBorder: 'border-cyan-500/30' },
  'approval-required': { label: 'Approvals', icon: ShieldCheck,        chipBg: 'bg-amber-500/15',  chipText: 'text-amber-400',  chipBorder: 'border-amber-500/30' },
  'complaint-update':  { label: 'Complaints', icon: MessageSquareWarning, chipBg: 'bg-rose-500/15', chipText: 'text-rose-400',   chipBorder: 'border-rose-500/30' },
  'attendance':        { label: 'Attendance', icon: CalendarCheck,      chipBg: 'bg-emerald-500/15', chipText: 'text-emerald-400', chipBorder: 'border-emerald-500/30' },
  'general':           { label: 'General',   icon: Info,                chipBg: 'bg-slate-500/15',  chipText: 'text-slate-400',  chipBorder: 'border-slate-500/30' },
  'info':              { label: 'Info',      icon: Info,                chipBg: 'bg-cyan-500/15',   chipText: 'text-cyan-400',   chipBorder: 'border-cyan-500/30' },
  'success':           { label: 'Success',   icon: ShieldCheck,        chipBg: 'bg-emerald-500/15', chipText: 'text-emerald-400', chipBorder: 'border-emerald-500/30' },
  'warning':           { label: 'Warnings',  icon: MessageSquareWarning, chipBg: 'bg-amber-500/15', chipText: 'text-amber-400',  chipBorder: 'border-amber-500/30' },
  'error':             { label: 'Errors',    icon: MessageSquareWarning, chipBg: 'bg-rose-500/15',  chipText: 'text-rose-400',   chipBorder: 'border-rose-500/30' },
};

// ─── Digest type ────────────────────────────────────────────────
interface DigestData {
  totalUnread: number;
  groups: Array<{ type: string; label: string; count: number }>;
  highlights: Array<{ title: string; type: string }>;
}

// ─── Digest Modal type ──────────────────────────────────────────
interface DigestModalData {
  since: string;
  total: number;
  unreadCount: number;
  grouped: Array<{
    type: string;
    label: string;
    count: number;
    items: Array<{
      id: string;
      title: string;
      message?: string;
      type: string;
      isRead: boolean;
      createdAt: string;
      actionData?: string;
    }>;
  }>;
  actionable: Array<{
    id: string;
    title: string;
    message?: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    actionData?: string;
  }>;
  timeGroups: {
    today: number;
    yesterday: number;
    earlier: number;
  };
}

export function NotificationPanel() {
  const {
    notificationPanelOpen,
    setNotificationPanelOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveView,
    user,
    executeNotificationAction,
    pendingActions,
  } = useEMSStore();

  // ── State ──────────────────────────────────────────────────────
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeFilter, setActiveFilterState] = useState<FilterTab>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [markAllAnimating, setMarkAllAnimating] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // ── New feature state ──────────────────────────────────────────
  const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(null);
  const [digestData, setDigestData] = useState<DigestData | null>(null);
  const [digestDismissed, setDigestDismissed] = useState(false);
  const [digestLoading, setDigestLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [digestModalOpen, setDigestModalOpen] = useState(false);
  const [digestModalData, setDigestModalData] = useState<DigestModalData | null>(null);
  const [digestModalLoading, setDigestModalLoading] = useState(false);

  const prevNotifCountRef = useRef(notifications.length);
  const newNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Real-time clock (updates every 30s) ───────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Detect new notifications arriving in real-time ─────────────
  useEffect(() => {
    const currentCount = notifications.length;
    if (currentCount > prevNotifCountRef.current && prevNotifCountRef.current > 0) {
      setHasNewNotification(true);
      if (newNotifTimerRef.current) clearTimeout(newNotifTimerRef.current);
      newNotifTimerRef.current = setTimeout(() => {
        setHasNewNotification(false);
      }, 3000);
    }
    prevNotifCountRef.current = currentCount;
    return () => {
      if (newNotifTimerRef.current) clearTimeout(newNotifTimerRef.current);
    };
  }, [notifications.length]);

  // ── Play notification sound when new notification arrives ────
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.value = 0.1;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    if (hasNewNotification) {
      playNotificationSound();
    }
  }, [hasNewNotification, playNotificationSound]);

  // ── Fetch digest when panel opens ──────────────────────────────
  useEffect(() => {
    if (notificationPanelOpen && !digestDismissed) {
      setDigestLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      fetch(`/api/notification-digest?since=${encodeURIComponent(since)}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed');
          return res.json();
        })
        .then((json) => {
          const raw = json.data ?? json;
          const totalUnread = raw.unreadCount ?? raw.totalUnread ?? 0;
          const groups: Array<{ type: string; label: string; count: number }> =
            (raw.grouped ?? raw.groups ?? []).map((g: any) => ({
              type: g.type,
              label: g.label,
              count: g.count,
            }));
          const highlights: Array<{ title: string; type: string }> = [];
          const grouped = raw.grouped ?? raw.groups ?? [];
          for (const g of grouped) {
            if (g.items && g.items.length > 0) {
              highlights.push({ title: g.items[0].title, type: g.type });
            }
            if (highlights.length >= 3) break;
          }
          if (totalUnread > 0 || groups.length > 0) {
            setDigestData({ totalUnread, groups, highlights });
          } else {
            setDigestData(null);
          }
        })
        .catch(() => {
          const unread = notifications.filter((n) => !n.isRead);
          if (unread.length === 0) {
            setDigestData(null);
            return;
          }
          const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentUnread = unread.filter(
            (n) => new Date(n.createdAt).getTime() > sinceDate.getTime()
          );
          if (recentUnread.length === 0) {
            setDigestData(null);
            return;
          }
          const groups: Record<string, { type: string; label: string; count: number }> = {};
          for (const n of recentUnread) {
            if (!groups[n.type]) {
              groups[n.type] = { type: n.type, label: typeLabels[n.type] || 'Info', count: 0 };
            }
            groups[n.type].count++;
          }
          setDigestData({
            totalUnread: recentUnread.length,
            groups: Object.values(groups),
            highlights: recentUnread.slice(0, 3).map((n) => ({ title: n.title, type: n.type })),
          });
        })
        .finally(() => setDigestLoading(false));
    }
  }, [notificationPanelOpen, digestDismissed, notifications]);

  // Reset digest dismissed state when panel closes
  useEffect(() => {
    if (!notificationPanelOpen) {
      setDigestDismissed(false);
      setDigestData(null);
      setActiveGroupFilter(null);
    }
  }, [notificationPanelOpen]);

  // Filter change handler that also resets visible count
  const setActiveFilter = (tab: FilterTab) => {
    setActiveFilterState(tab);
    setVisibleCount(ITEMS_PER_PAGE);
    setActiveGroupFilter(null);
  };

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // ── Filtered notifications ────────────────────────────────────
  const filtered = sorted.filter((n) => {
    if (dismissedIds.has(n.id)) return false;
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'mentions') {
      return n.message?.includes(`@${user?.name?.split(' ')[0] || ''}`) || n.type === 'approval-required' || n.type === 'task-assigned';
    }
    if (activeFilter === 'approvals') {
      return categoryFilterMap.approvals.includes(n.type);
    }
    if (activeFilter === 'tasks') {
      return categoryFilterMap.tasks.includes(n.type);
    }
    if (activeFilter === 'alerts') {
      return categoryFilterMap.alerts.includes(n.type);
    }
    return true;
  });

  // ── Apply group chip filter on top of regular filter ───────────
  const displayNotifs = activeGroupFilter
    ? filtered.filter((n) => n.type === activeGroupFilter)
    : filtered;

  const visibleNotifs = displayNotifs.slice(0, visibleCount);
  const hasMore = displayNotifs.length > visibleCount;

  // ── Group visibleNotifs by type for collapsible sections ──────
  const groupedVisibleNotifs = (() => {
    const groups: Record<string, typeof visibleNotifs> = {};
    for (const n of visibleNotifs) {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    }
    const sortedGroupEntries = Object.entries(groups).sort((a, b) => {
      const aLatest = new Date(a[1][0].createdAt).getTime();
      const bLatest = new Date(b[1][0].createdAt).getTime();
      return bLatest - aLatest;
    });
    return sortedGroupEntries.map(([type, notifs]) => ({
      type,
      notifs,
      count: notifs.length,
      isGrouped: notifs.length >= 3,
    }));
  })();

  const unreadCount = notifications.filter((n) => !n.isRead && !dismissedIds.has(n.id)).length;

  // ── Category summary ──────────────────────────────────────────
  const categorySummary = (() => {
    const cats: Record<string, number> = {};
    for (const n of sorted) {
      if (dismissedIds.has(n.id)) continue;
      cats[n.type] = (cats[n.type] || 0) + 1;
    }
    return Object.entries(cats).map(([type, count]) => ({
      type,
      count,
      colors: typeColors[type] || typeColors['general'],
      label: typeLabels[type] || 'Info',
    }));
  })();

  // ── Smart group counts (only types with 2+ notifications) ─────
  const smartGroups = (() => {
    const cats: Record<string, number> = {};
    for (const n of filtered) {
      if (dismissedIds.has(n.id)) continue;
      cats[n.type] = (cats[n.type] || 0) + 1;
    }
    return Object.entries(cats)
      .filter(([, count]) => count >= 2)
      .map(([type, count]) => ({
        type,
        count,
        config: groupChipConfig[type] || {
          label: typeLabels[type] || 'Info',
          icon: Info,
          chipBg: 'bg-slate-500/15',
          chipText: 'text-slate-400',
          chipBorder: 'border-slate-500/30',
        },
      }));
  })();

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    setMarkAllAnimating(true);
    await markAllNotificationsRead();
    setTimeout(() => {
      setMarkAllAnimating(false);
      toast.success('All notifications marked as read');
    }, 600);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleViewAction = (notif: typeof sorted[number]) => {
    handleMarkRead(notif.id);
    const typeToView: Record<string, string> = {
      'attendance': 'attendance',
      'leave-update': 'leaves',
      'task-assigned': 'tasks',
      'complaint-update': 'complaints',
      'approval-required': 'requests',
    };
    const view = typeToView[notif.type];
    if (view) {
      setActiveView(view as ActiveView);
      setNotificationPanelOpen(false);
    }
  };

  // ── Handle notification action (Approve/Reject/Acknowledge) ───
  const handleNotificationAction = async (
    notificationId: string,
    action: 'approve' | 'reject' | 'acknowledge',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setActionLoadingIds((prev) => new Set(prev).add(notificationId));
    try {
      await executeNotificationAction(notificationId, action);
      toast.success(`Action "${action}" applied successfully`);
    } catch (err) {
      toast.error(`Failed to ${action}. Please try again.`);
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const hasAction = (type: string) =>
    ['task-assigned', 'approval-required', 'complaint-update', 'attendance', 'leave-update'].includes(type);

  // ── Derive priority from notification type ─────────────────────
  const getPriority = (type: string): string => {
    if (['error', 'complaint-update'].includes(type)) return 'urgent';
    if (['warning', 'approval-required'].includes(type)) return 'high';
    if (['task-assigned', 'leave-update', 'attendance'].includes(type)) return 'medium';
    return 'low';
  };

  const formatLastUpdated = useCallback(() => {
    return lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [lastUpdated]);

  // ── Check if a notification has actionable buttons ─────────────
  const hasActionableData = (notif: typeof sorted[number]): notif is typeof notif & { actionData: NotificationActionData } => {
    return (
      notif.actionData != null &&
      Array.isArray(notif.actionData.actions) &&
      (notif.actionData.actions.includes('approve') || notif.actionData.actions.includes('reject'))
    );
  };

  // ── Toggle collapsible group ──────────────────────────────────
  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // ── Open Digest Modal and fetch data ──────────────────────────
  const openDigestModal = () => {
    setDigestModalOpen(true);
    setDigestModalLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/notification-digest?since=${encodeURIComponent(since)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((json) => {
        const data = json.data ?? json;
        setDigestModalData(data as DigestModalData);
      })
      .catch(() => {
        // Fallback: compute from local notifications
        const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = sorted.filter(
          (n) => new Date(n.createdAt).getTime() > sinceDate.getTime() && !dismissedIds.has(n.id)
        );
        const groupMap: Record<string, { type: string; label: string; count: number; items: DigestModalData['grouped'][0]['items'] }> = {};
        for (const n of recent) {
          if (!groupMap[n.type]) {
            groupMap[n.type] = { type: n.type, label: typeLabels[n.type] || n.type, count: 0, items: [] };
          }
          groupMap[n.type].count++;
          groupMap[n.type].items.push({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
            actionData: n.actionData ? JSON.stringify(n.actionData) : undefined,
          });
        }
        const actionable = recent.filter((n) =>
          n.type === 'approval-required' || hasActionableData(n)
        ).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          createdAt: n.createdAt,
          actionData: n.actionData ? JSON.stringify(n.actionData) : undefined,
        }));
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        const todayCount = recent.filter((n) => new Date(n.createdAt) >= todayStart).length;
        const yesterdayCount = recent.filter((n) => {
          const d = new Date(n.createdAt);
          return d >= yesterdayStart && d < todayStart;
        }).length;
        const earlierCount = recent.filter((n) => new Date(n.createdAt) < yesterdayStart).length;
        setDigestModalData({
          since: sinceDate.toISOString(),
          total: recent.length,
          unreadCount: recent.filter((n) => !n.isRead).length,
          grouped: Object.values(groupMap),
          actionable,
          timeGroups: { today: todayCount, yesterday: yesterdayCount, earlier: earlierCount },
        });
      })
      .finally(() => setDigestModalLoading(false));
  };

  // ── Render a single notification card ──────────────────────────
  const renderNotifCard = (notif: typeof sorted[number], index: number, inGroup = false) => {
    const Icon = typeIcons[notif.type] || Info;
    const colors = typeColors[notif.type] || typeColors['general'];
    const priority = getPriority(notif.type);
    const isActionable = hasActionableData(notif);
    const isLoading = actionLoadingIds.has(notif.id) || pendingActions[`notif-action-${notif.id}`];

    return (
      <motion.div
        key={notif.id}
        variants={itemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25, delay: index * 0.03 }}
        layout
        className={`group relative p-3 rounded-xl border cursor-pointer transition-colors ${
          notif.isRead
            ? 'bg-transparent border-border/30'
            : `${colors.bg} ${colors.border} border`
        } ${isActionable ? 'pb-2' : ''} ${inGroup ? 'border-l-2' : ''}`}
        onClick={() => handleMarkRead(notif.id)}
        whileHover={{ x: 4 }}
      >
        <div className="flex gap-3">
          {/* Icon */}
          <div className={`mt-0.5 p-1.5 rounded-lg ${colors.bg} shrink-0`}>
            <Icon className={`h-4 w-4 ${colors.icon}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm font-medium leading-tight ${
                    !notif.isRead ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {notif.title}
                </p>
                {/* Priority indicator dot */}
                {!notif.isRead && (
                  <span
                    className={`rounded-full ${colors.dot} shrink-0 ${priorityDotSize[priority] || 'h-2 w-2'}`}
                  />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${colors.icon} ${colors.border} border`}
                >
                  {typeLabels[notif.type] || 'Info'}
                </Badge>
                {/* Dismiss button on hover */}
                <motion.button
                  className="opacity-0 group-hover:opacity-100 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(notif.id);
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-2.5 w-2.5" />
                </motion.button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {notif.message}
            </p>

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Clock className="h-2.5 w-2.5" />
                {notif.createdAt ? timeAgo(notif.createdAt) : ''}
              </div>

              {/* Default "View" button for actionable types without actionData */}
              {hasAction(notif.type) && !notif.isRead && !isActionable && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-[10px] gap-1 text-cyan-400 hover:text-cyan-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAction(notif);
                    }}
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    View
                  </Button>
                </motion.div>
              )}
            </div>

            {/* ── Inline Action Buttons for actionable notifications ── */}
            {isActionable && !notif.isRead && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex items-center gap-2 pt-1.5 mt-1 border-t border-border/20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Approve */}
                {notif.actionData.actions.includes('approve') && (
                  <Button
                    size="sm"
                    disabled={isLoading}
                    className="h-6 px-2.5 text-[10px] gap-1 bg-emerald-600/80 hover:bg-emerald-600 text-white border-0 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                    onClick={(e) => handleNotificationAction(notif.id, 'approve', e)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-2.5 w-2.5" />
                    )}
                    Approve
                  </Button>
                )}
                {/* Reject */}
                {notif.actionData.actions.includes('reject') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    className="h-6 px-2.5 text-[10px] gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    onClick={(e) => handleNotificationAction(notif.id, 'reject', e)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <ThumbsDown className="h-2.5 w-2.5" />
                    )}
                    Reject
                  </Button>
                )}
                {/* Acknowledge */}
                {notif.actionData.actions.includes('acknowledge') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    className="h-6 px-2.5 text-[10px] gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                    onClick={(e) => handleNotificationAction(notif.id, 'acknowledge', e)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Eye className="h-2.5 w-2.5" />
                    )}
                    Acknowledge
                  </Button>
                )}
                {/* View (always available alongside actions) */}
                {notif.actionData.actions.includes('view') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAction(notif);
                    }}
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    View
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Digest modal: compute timeline from local notifications ───
  const digestTimelineGroups = (() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const todayNotifs = sorted.filter((n) => !dismissedIds.has(n.id) && new Date(n.createdAt) >= todayStart);
    const yesterdayNotifs = sorted.filter((n) => {
      const d = new Date(n.createdAt);
      return !dismissedIds.has(n.id) && d >= yesterdayStart && d < todayStart;
    });
    const earlierNotifs = sorted.filter((n) => !dismissedIds.has(n.id) && new Date(n.createdAt) < yesterdayStart);
    return [
      { label: 'Today', items: todayNotifs },
      { label: 'Yesterday', items: yesterdayNotifs },
      { label: 'Earlier', items: earlierNotifs },
    ].filter((g) => g.items.length > 0);
  })();

  return (
    <>
      <Sheet open={notificationPanelOpen} onOpenChange={setNotificationPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {/* ── Header ─────────────────────────────────────── */}
          <SheetHeader className="p-4 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Bell className="h-5 w-5 text-emerald-400" />
                  {unreadCount > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                  )}
                  {/* ── New notification pulse indicator ──── */}
                  <AnimatePresence>
                    {hasNewNotification && (
                      <motion.span
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-400"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [0, 1.4, 1, 1.2, 1],
                          opacity: [0, 1, 1, 0.8, 0],
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <SheetTitle className="text-base">Notifications</SheetTitle>
                {unreadCount > 0 && (
                  <Badge
                    className="h-5 px-1.5 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border-rose-500/30 border"
                  >
                    {unreadCount} new
                  </Badge>
                )}
                {/* ── "New" badge animation when real-time notification arrives ── */}
                <AnimatePresence>
                  {hasNewNotification && (
                    <motion.div
                      initial={{ opacity: 0, x: -8, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 8, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Badge className="h-5 px-1.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border animate-pulse">
                        New
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1">
                {/* Daily Digest button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={openDigestModal}
                  title="Daily Digest"
                >
                  <ScrollText className="h-3.5 w-3.5" />
                </Button>

                {/* Sound toggle — bell icon with slash */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    toast.success(soundEnabled ? 'Notification sounds muted' : 'Notification sounds enabled');
                  }}
                  title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                >
                  {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </Button>

                {/* Mark all as read with satisfying check animation */}
                {unreadCount > 0 && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      className="text-xs gap-1.5 text-muted-foreground hover:text-foreground relative overflow-hidden"
                    >
                      <motion.div
                        animate={markAllAnimating ? {
                          scale: [1, 1.5, 0],
                          rotate: [0, 0, 180],
                          opacity: [1, 1, 0],
                        } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </motion.div>
                      {markAllAnimating ? (
                        <motion.span
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-emerald-400 font-semibold"
                        >
                          ✓ All read!
                        </motion.span>
                      ) : (
                        'Mark all read'
                      )}
                    </Button>
                    {/* Satisfying success flash overlay */}
                    <AnimatePresence>
                      {markAllAnimating && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: [0, 0.3, 0], scale: [0.5, 2, 2.5] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6 }}
                          className="absolute inset-0 rounded-md bg-emerald-400 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>
            <SheetDescription className="sr-only">
              Your notifications and alerts
            </SheetDescription>

            {/* ── Last updated clock ──────────────────────────── */}
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/50">
              <Clock className="h-2.5 w-2.5" />
              Last updated: {formatLastUpdated()}
            </div>
          </SheetHeader>

          {/* ── Category Summary Bar ──────────────────────────── */}
          {categorySummary.length > 0 && (
            <div className="px-4 py-2 border-b border-border/30">
              <div className="flex items-center gap-3 flex-wrap">
                {categorySummary.map((cat) => (
                  <div key={cat.type} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cat.colors.dot}`} />
                    <span className="text-[10px] text-muted-foreground">{cat.label}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground/80">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Filter Tabs ──────────────────────────────────── */}
          <div className="px-4 pt-2 pb-1 flex items-center gap-1 border-b border-border/30 overflow-x-auto scrollbar-none">
            {(['all', 'unread', 'mentions', 'approvals', 'tasks', 'alerts'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`relative px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeFilter === tab
                    ? 'text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tabLabels[tab]}
                {activeFilter === tab && (
                  <motion.div
                    layoutId="notif-tab-indicator"
                    className="absolute bottom-0 left-1 right-1 h-0.5 bg-emerald-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── Smart Grouping Chips ─────────────────────────────── */}
          {smartGroups.length > 0 && (
            <div className="px-4 py-2 border-b border-border/30">
              <div className="flex items-center gap-2 flex-wrap">
                {smartGroups.map((group) => {
                  const ChipIcon = group.config.icon;
                  const isActive = activeGroupFilter === group.type;
                  return (
                    <motion.button
                      key={group.type}
                      onClick={() => setActiveGroupFilter(isActive ? null : group.type)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                        isActive
                          ? `${group.config.chipBg} ${group.config.chipText} ${group.config.chipBorder} ring-1 ring-current/30`
                          : `${group.config.chipBg} ${group.config.chipText} ${group.config.chipBorder} hover:ring-1 hover:ring-current/20`
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      layout
                    >
                      <ChipIcon className="h-3 w-3" />
                      <span>{group.count} {group.config.label}</span>
                      {isActive && (
                        <X className="h-2.5 w-2.5 ml-0.5 opacity-70" />
                      )}
                    </motion.button>
                  );
                })}
                {activeGroupFilter && (
                  <button
                    onClick={() => setActiveGroupFilter(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Notification List ───────────────────────────── */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1.5">
              {/* ── "While You Were Away" Digest Section ──────── */}
              <AnimatePresence>
                {digestData && !digestDismissed && digestData.totalUnread > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-cyan-500/5"
                  >
                    {/* Subtle animated background shimmer */}
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.05) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
                      transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                    />

                    <div className="relative p-3.5">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <Moon className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">While You Were Away</h4>
                            <p className="text-[10px] text-muted-foreground">
                              {digestData.totalUnread} notification{digestData.totalUnread !== 1 ? 's' : ''} in the last 24h
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setDigestDismissed(true)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Grouped summary chips */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {digestData.groups.map((group) => {
                          const chipConf = groupChipConfig[group.type];
                          if (!chipConf) return null;
                          const GroupIcon = chipConf.icon;
                          return (
                            <span
                              key={group.type}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${chipConf.chipBg} ${chipConf.chipText} border ${chipConf.chipBorder}`}
                            >
                              <GroupIcon className="h-2.5 w-2.5" />
                              {group.count} {chipConf.label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Highlights */}
                      {digestData.highlights.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Key highlights</p>
                          {digestData.highlights.map((h, i) => {
                            const hColors = typeColors[h.type] || typeColors['general'];
                            return (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${hColors.dot}`} />
                                <span className="text-[11px] text-muted-foreground truncate">{h.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Digest loading skeleton ──────────────────── */}
              {digestLoading && !digestData && (
                <div className="rounded-xl border border-border/30 p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-muted/30 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-muted/30 animate-pulse" />
                      <div className="h-2 w-24 rounded bg-muted/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Grouped Notification List ──────────────────── */}
              <AnimatePresence mode="popLayout">
                {groupedVisibleNotifs.map((group, groupIdx) => {
                  if (group.isGrouped) {
                    // ── Collapsible group with 3+ items ──
                    const GroupIcon = typeIcons[group.type] || Info;
                    const colors = typeColors[group.type] || typeColors['general'];
                    const chipConf = groupChipConfig[group.type];
                    const isExpanded = expandedGroups.has(group.type);

                    return (
                      <div key={`group-${group.type}`} className="space-y-1">
                        {/* Group header button */}
                        <motion.button
                          variants={itemVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: 0.25, delay: groupIdx * 0.03 }}
                          layout
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => toggleGroup(group.type)}
                          whileHover={{ x: 2 }}
                        >
                          <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                            <GroupIcon className={`h-3.5 w-3.5 ${colors.icon}`} />
                          </div>
                          <span className="text-xs font-medium text-foreground flex-1 text-left">
                            {group.count} {chipConf?.label || typeLabels[group.type] || 'Notifications'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${colors.icon} ${colors.border} border`}
                          >
                            {group.count}
                          </Badge>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className={`h-3.5 w-3.5 ${colors.icon}`} />
                          </motion.div>
                        </motion.button>

                        {/* Expanded group items */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className={`ml-3 pl-3 border-l-2 ${colors.border} space-y-1.5 py-1`}>
                                {group.notifs.map((notif, i) => renderNotifCard(notif, i, true))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // ── 1-2 items: render individually ──
                  return (
                    <div key={`singles-${group.type}`}>
                      {group.notifs.map((notif, i) => renderNotifCard(notif, groupIdx + i, false))}
                    </div>
                  );
                })}
              </AnimatePresence>

              {/* ── Empty State with enhanced illustration ──── */}
              {displayNotifs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-6">
                    {/* Outer ring */}
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center border border-white/5">
                      <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                        <div className="ems-bell-swing">
                          <Bell className="h-7 w-7 text-muted-foreground/30" />
                        </div>
                      </div>
                    </div>
                    {/* Floating decorative elements */}
                    <motion.div
                      className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    >
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </motion.div>
                    <motion.div
                      className="absolute -top-1 -left-3 h-6 w-6 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20"
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    >
                      <CheckCheck className="h-3 w-3 text-cyan-400" />
                    </motion.div>
                  </div>
                  <p className="text-sm font-medium text-foreground/80">
                    {activeGroupFilter
                      ? `No ${typeLabels[activeGroupFilter] || ''} notifications`
                      : activeFilter === 'unread' ? 'No unread notifications' :
                      activeFilter === 'mentions' ? 'No mentions found' :
                      activeFilter === 'approvals' ? 'No approval requests' :
                      activeFilter === 'tasks' ? 'No task notifications' :
                      activeFilter === 'alerts' ? 'No alerts right now' :
                      'All caught up!'}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1 max-w-[200px]">
                    {activeGroupFilter
                      ? "Try selecting a different group or clear the filter."
                      : activeFilter === 'unread' ? "You've read everything." :
                      activeFilter === 'mentions' ? "No one has mentioned you yet." :
                      "We'll notify you when something comes up."}
                  </p>
                  {/* Show filter reset button if on a non-default filter */}
                  {(activeFilter !== 'all' || activeGroupFilter) && sorted.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
                      onClick={() => {
                        setActiveFilter('all');
                        setActiveGroupFilter(null);
                      }}
                    >
                      View all notifications
                    </Button>
                  )}
                </div>
              )}

              {/* ── Load More Button ──────────────────────────── */}
              {hasMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center pt-2 pb-1"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Load more ({displayNotifs.length - visibleCount} remaining)
                  </Button>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* ── Footer ──────────────────────────────────────── */}
          {sorted.length > 0 && (
            <div className="p-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground/50 text-center">
                {displayNotifs.length} notification{displayNotifs.length !== 1 ? 's' : ''} &middot; {unreadCount} unread
                {activeGroupFilter && ` · Filtered: ${typeLabels[activeGroupFilter] || activeGroupFilter}`}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Daily Digest Modal ────────────────────────────────── */}
      <Dialog open={digestModalOpen} onOpenChange={setDigestModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <ScrollText className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Daily Digest</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {digestModalLoading ? (
            <div className="flex-1 p-5 space-y-4">
              <div className="h-8 w-full rounded-lg bg-muted/20 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-3/4 rounded bg-muted/20 animate-pulse" />
                <div className="h-16 w-full rounded-lg bg-muted/15 animate-pulse" />
                <div className="h-16 w-full rounded-lg bg-muted/15 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-1/2 rounded bg-muted/20 animate-pulse" />
                <div className="h-12 w-full rounded-lg bg-muted/15 animate-pulse" />
              </div>
            </div>
          ) : digestModalData ? (
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* ── Summary Bar ── */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">{digestModalData.total} notifications</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="text-xs font-semibold text-rose-400">{digestModalData.unreadCount} unread</span>
                  </div>
                  {digestModalData.actionable.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <ShieldCheck className="h-3 w-3 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">{digestModalData.actionable.length} require action</span>
                    </div>
                  )}
                </div>

                {/* ── Grouped Sections ── */}
                {digestModalData.grouped.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grouped Summary</h4>
                    {digestModalData.grouped.map((group) => {
                      const GroupIcon = typeIcons[group.type] || Info;
                      const colors = typeColors[group.type] || typeColors['general'];
                      const chipConf = groupChipConfig[group.type];
                      const isExpanded = expandedGroups.has(`digest-${group.type}`);

                      return (
                        <div key={group.type} className="rounded-lg border border-border/30 overflow-hidden">
                          <button
                            className="w-full flex items-center gap-2.5 p-3 hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => toggleGroup(`digest-${group.type}`)}
                          >
                            <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                              <GroupIcon className={`h-4 w-4 ${colors.icon}`} />
                            </div>
                            <span className="text-sm font-medium text-foreground flex-1 text-left">
                              {chipConf?.label || group.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 h-5 ${colors.icon} ${colors.border} border`}
                            >
                              {group.count}
                            </Badge>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className={`h-4 w-4 ${colors.icon}`} />
                            </motion.div>
                          </button>
                          <AnimatePresence>
                            {isExpanded && group.items && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className={`mx-3 mb-3 pl-3 border-l-2 ${colors.border} space-y-1.5 max-h-40 overflow-y-auto`}>
                                  {group.items.map((item) => (
                                    <div key={item.id} className="py-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`h-1.5 w-1.5 rounded-full ${!item.isRead ? colors.dot : 'bg-muted-foreground/30'} shrink-0`} />
                                        <span className={`text-xs ${!item.isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                          {item.title}
                                        </span>
                                      </div>
                                      {item.message && (
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 ml-3.5 line-clamp-1">
                                          {item.message}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Actionable Items Section ── */}
                {digestModalData.actionable.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Items needing your attention
                    </h4>
                    <div className="space-y-2">
                      {digestModalData.actionable.map((item) => {
                        const ItemIcon = typeIcons[item.type] || Info;
                        const itemColors = typeColors[item.type] || typeColors['general'];
                        let parsedActions: string[] = [];
                        try {
                          const ad = item.actionData ? JSON.parse(item.actionData) : {};
                          parsedActions = ad.actions || [];
                        } catch {}

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border ${itemColors.bg} ${itemColors.border} border`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 rounded-lg ${itemColors.bg} shrink-0`}>
                                <ItemIcon className={`h-4 w-4 ${itemColors.icon}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                {item.message && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.message}</p>
                                )}
                                {(parsedActions.includes('approve') || parsedActions.includes('reject')) && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {parsedActions.includes('approve') && (
                                      <Button
                                        size="sm"
                                        className="h-6 px-2.5 text-[10px] gap-1 bg-emerald-600/80 hover:bg-emerald-600 text-white border-0"
                                        onClick={async () => {
                                          try {
                                            await executeNotificationAction(item.id, 'approve');
                                            toast.success('Approved successfully');
                                            openDigestModal(); // refresh
                                          } catch {
                                            toast.error('Failed to approve');
                                          }
                                        }}
                                      >
                                        <ThumbsUp className="h-2.5 w-2.5" />
                                        Approve
                                      </Button>
                                    )}
                                    {parsedActions.includes('reject') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2.5 text-[10px] gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                        onClick={async () => {
                                          try {
                                            await executeNotificationAction(item.id, 'reject');
                                            toast.success('Rejected successfully');
                                            openDigestModal(); // refresh
                                          } catch {
                                            toast.error('Failed to reject');
                                          }
                                        }}
                                      >
                                        <ThumbsDown className="h-2.5 w-2.5" />
                                        Reject
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 shrink-0">
                                <Clock className="h-2.5 w-2.5" />
                                {timeAgo(item.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Timeline View ── */}
                {digestTimelineGroups.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h4>
                    {digestTimelineGroups.map((tg) => (
                      <div key={tg.label} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground">{tg.label}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 h-4">{tg.items.length}</Badge>
                          <div className="flex-1 h-px bg-border/30" />
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {tg.items.slice(0, 5).map((item) => {
                            const tlColors = typeColors[item.type] || typeColors['general'];
                            return (
                              <div key={item.id} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/20 transition-colors cursor-pointer"
                                onClick={() => {
                                  handleMarkRead(item.id);
                                  setDigestModalOpen(false);
                                }}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${!item.isRead ? tlColors.dot : 'bg-muted-foreground/30'} shrink-0`} />
                                <span className={`text-xs truncate flex-1 ${!item.isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                  {item.title}
                                </span>
                                <span className="text-[9px] text-muted-foreground/50 shrink-0">
                                  {timeAgo(item.createdAt)}
                                </span>
                              </div>
                            );
                          })}
                          {tg.items.length > 5 && (
                            <p className="text-[10px] text-muted-foreground/50 text-center py-1">
                              +{tg.items.length - 5} more
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── No data state ── */}
                {digestModalData.total === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications in the last 24 hours</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Failed to load digest</p>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border/50 flex-row gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs flex-1"
              onClick={() => setDigestModalOpen(false)}
            >
              Close
            </Button>
            {unreadCount > 0 && (
              <Button
                size="sm"
                className="text-xs gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white border-0 flex-1"
                onClick={async () => {
                  await markAllNotificationsRead();
                  toast.success('All notifications marked as read');
                  openDigestModal(); // refresh
                }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
