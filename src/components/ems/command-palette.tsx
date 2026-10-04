'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEMSStore } from '@/lib/store';
import type { ActiveView } from '@/lib/types';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  ListTodo,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  DollarSign,
  Users,
  Scale,
  UsersRound,
  Search,
  Plus,
  LogOut,
  Sun,
  Moon,
  Bell,
  Palette,
  Sparkles,
  UserPlus,
  FileSpreadsheet,
  Zap,
  AlertTriangle,
  Timer,
  Sunrise,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

/* ────────────── Types ────────────── */

interface PaletteItem {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  group: 'suggested' | 'recent-actions' | 'navigation' | 'users' | 'tasks' | 'actions';
  timestamp?: number;
  description?: string;
}

/* ────────────── Nav items registry ────────────── */

const navRegistry: Array<{
  id: ActiveView;
  label: string;
  icon: LucideIcon;
  keywords: string[];
  shortcut?: string;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'main'] },
  { id: 'attendance', label: 'Attendance', icon: Clock, keywords: ['clock', 'punch', 'time', 'check-in', 'my attendance', 'attendance records'], shortcut: '⌘2' },
  { id: 'leaves', label: 'Leave Management', icon: CalendarDays, keywords: ['vacation', 'time-off', 'absence', 'sick', 'apply leave', 'request time off'], shortcut: '⌘L' },
  { id: 'tasks', label: 'Task Board', icon: ListTodo, keywords: ['todo', 'kanban', 'project', 'work', 'my tasks', 'task board', 'show tasks', 'overdue tasks'], shortcut: '⌘T' },
  { id: 'requests', label: 'Requests', icon: FileText, keywords: ['expense', 'asset', 'shift-swap', 'submit request', 'new request'], shortcut: '⌘5' },
  { id: 'complaints', label: 'Complaints', icon: MessageSquare, keywords: ['issue', 'grievance', 'report', 'file complaint', 'report issue'], shortcut: '⌘6' },
  { id: 'payroll', label: 'Payroll', icon: DollarSign, keywords: ['salary', 'pay', 'compensation', 'wages', 'check payslip', 'view salary', 'my pay', 'payslip'], shortcut: '⌘P' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, keywords: ['reports', 'charts', 'insights', 'data'], shortcut: '⌘8' },
  { id: 'settings', label: 'Settings', icon: Settings, keywords: ['config', 'preferences', 'system'] },
  { id: 'users', label: 'User Management', icon: Users, keywords: ['employees', 'people', 'staff'], shortcut: '⌘9' },
  { id: 'rules', label: 'Rules Engine', icon: Scale, keywords: ['automation', 'triggers', 'policies'] },
  { id: 'team', label: 'Team Overview', icon: UsersRound, keywords: ['group', 'members', 'squad'] },
];

/* ────────────── Natural Language keyword mappings ────────────── */
/* These keywords are embedded into palette items so cmdk's built-in
   fuzzy search naturally handles natural language matching. */

const naturalLanguageKeywords: Record<string, string[]> = {
  'action-clock-in': ['clock in', 'punch in', 'check in', 'start work', 'begin day'],
  'action-clock-out': ['clock out', 'punch out', 'check out', 'end work', 'finish day'],
  'action-apply-leave': ['apply leave', 'request time off', 'time off', 'request leave', 'leave tomorrow', 'leave today', 'sick leave', 'day off'],
  'action-check-payslip': ['check payslip', 'view salary', 'my pay', 'view payslip', 'salary slip', 'pay stub', 'pay details'],
  'action-file-complaint': ['file complaint', 'report issue', 'raise complaint', 'submit complaint', 'lodge complaint'],
  'action-new-request': ['submit request', 'new request', 'create request', 'raise request'],
  'action-my-tasks': ['my tasks', 'task board', 'show tasks', 'view tasks', 'open tasks'],
  'action-my-attendance': ['my attendance', 'attendance records', 'view attendance', 'attendance history'],
  'action-notifications': ['notifications', 'show alerts', 'inbox', 'unread', 'check notifications', 'view alerts'],
  'action-check-leave-status': ['check leave status', 'leave status', 'pending leaves', 'my leaves', 'leave requests'],
  'action-view-overdue-tasks': ['overdue tasks', 'late tasks', 'past due', 'missed deadline'],
};

/* ────────────── Helper: time ago ────────────── */

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ────────────── Helper: get today's date string ────────────── */

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ────────────── Component ────────────── */

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveView,
    users,
    tasks,
    setClockInModalOpen,
    setNotificationPanelOpen,
    toggleSidebar,
    logout,
    addRecentSearch,
    recentSearches,
    toggleKeyboardShortcuts,
    recentActions,
    addRecentAction,
    attendance,
    leaves,
    requests,
    notifications,
    user,
  } = useEMSStore();

  const { setTheme, theme } = useTheme();
  // Key counter to force Command remount and reset search when palette reopens
  const [paletteKey, setPaletteKey] = useState(0);

  // Search value state for NLP integration
  const [searchValue, setSearchValue] = useState('');

  // NLP result state
  const [nlpResult, setNlpResult] = useState<{
    intent: string;
    params: Record<string, unknown>;
    confidence: number;
    previewText: string;
    requiresConfirmation: boolean;
    suggestions: string[];
  } | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  /* Close on Escape is handled by the useKeyboardShortcuts hook */

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      // Track the action in recent actions
      addRecentAction({
        id: item.id,
        label: item.label,
        action: item.action,
        icon: item.icon?.name,
      });
      item.action();
      setCommandPaletteOpen(false);
      setPaletteKey((k) => k + 1);
    },
    [setCommandPaletteOpen, addRecentAction]
  );

  /* ───── NLP Command Execution ───── */

  const executeNlpCommand = useCallback((result: typeof nlpResult) => {
    if (!result) return;
    const { intent, params } = result;

    switch (intent) {
      case 'clock-in':
      case 'clock-out':
        setClockInModalOpen(true);
        break;
      case 'apply-leave':
        // Navigate to apply leave view
        setActiveView('apply-leave');
        break;
      case 'navigate':
        if (params.view && typeof params.view === 'string') {
          setActiveView(params.view as ActiveView);
        }
        break;
      case 'create-task':
        setActiveView('tasks');
        break;
      case 'submit-request':
        setActiveView('submit-request');
        break;
      case 'file-complaint':
        setActiveView('submit-complaint');
        break;
      case 'notification-action':
        setNotificationPanelOpen(true);
        break;
      default:
        toast.info('Command executed');
    }

    addRecentAction({
      id: `nlp-${intent}`,
      label: result.previewText,
      action: () => executeNlpCommand(result),
      icon: 'Sparkles',
    });

    toast.success(result.previewText);
  }, [setClockInModalOpen, setActiveView, setNotificationPanelOpen, addRecentAction]);

  /* ───── Debounced NLP API call ───── */

  useEffect(() => {
    if (searchValue.length < 3) {
      setNlpResult(null);
      return;
    }
    const timer = setTimeout(async () => {
      setNlpLoading(true);
      try {
        const res = await fetch('/api/nlp-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: searchValue }),
        });
        const data = await res.json();
        if (data.status === 'success' && data.data.intent !== 'unknown') {
          setNlpResult(data.data);
        } else {
          setNlpResult(null);
        }
      } catch {
        setNlpResult(null);
      } finally {
        setNlpLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  /* ───── Context-aware state computation ───── */

  const contextState = useMemo(() => {
    const today = getTodayStr();
    const now = new Date();
    const currentHour = now.getHours();

    // Check if user is clocked in today
    const todayRecord = attendance.find(
      (a) => a.userId === user?.id && a.date === today
    );
    const isClockedIn = !!(todayRecord?.clockIn || todayRecord?.firstIn);
    const isClockedOut = !!(todayRecord?.clockOut || todayRecord?.lastOut);

    // Pending leaves for current user
    const pendingLeaves = leaves.filter(
      (l) => l.userId === user?.id && l.status === 'pending'
    );

    // Overdue tasks assigned to current user
    const overdueTasks = tasks.filter(
      (t) =>
        t.assigneeId === user?.id &&
        t.status !== 'done' &&
        t.dueDate &&
        new Date(t.dueDate) < now
    );

    // Unread notifications count
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Pending requests for current user
    const pendingRequests = requests.filter(
      (r) => r.userId === user?.id && r.status === 'pending'
    );

    // Time-based greeting context
    const isMorning = currentHour < 10;
    const isAfternoon = currentHour >= 12 && currentHour < 17;

    return {
      isClockedIn,
      isClockedOut,
      pendingLeaves,
      overdueTasks,
      unreadCount,
      pendingRequests,
      isMorning,
      isAfternoon,
    };
  }, [attendance, leaves, tasks, notifications, requests, user?.id]);

  /* Build all searchable items */
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // ───── Suggested items (context-aware) ─────
    const suggestedItems: PaletteItem[] = [];

    // NLP result item — shown at the very top when available
    if (nlpResult && nlpResult.confidence > 0.5) {
      suggestedItems.unshift({
        id: 'nlp-command',
        label: nlpResult.previewText,
        icon: Sparkles,
        keywords: ['nlp', 'smart'],
        action: () => {
          executeNlpCommand(nlpResult);
        },
        group: 'suggested',
        description: `✨ Smart command (${Math.round(nlpResult.confidence * 100)}% confidence)`,
      });
    }

    // NLP loading indicator
    if (nlpLoading) {
      suggestedItems.push({
        id: 'nlp-loading',
        label: 'Parsing command...',
        icon: Sparkles,
        keywords: ['nlp', 'loading'],
        action: () => {}, // no-op
        group: 'suggested',
        description: 'AI is analyzing your command',
      });
    }

    if (!contextState.isClockedIn) {
      suggestedItems.push({
        id: 'suggested-clock-in',
        label: 'Clock In to start your day',
        icon: Sunrise,
        keywords: ['clock in', 'punch in', 'start', 'begin'],
        action: () => setClockInModalOpen(true),
        group: 'suggested',
      });
    } else if (contextState.isClockedIn && !contextState.isClockedOut) {
      suggestedItems.push({
        id: 'suggested-clock-out',
        label: 'Clock Out for the day',
        icon: Timer,
        keywords: ['clock out', 'punch out', 'end', 'finish'],
        action: () => setClockInModalOpen(true),
        group: 'suggested',
      });
    }

    if (contextState.pendingLeaves.length > 0) {
      suggestedItems.push({
        id: 'suggested-check-leaves',
        label: `Check Leave Status (${contextState.pendingLeaves.length} pending)`,
        icon: CalendarDays,
        keywords: ['leave status', 'pending leaves', 'check leave'],
        action: () => setActiveView('leaves'),
        group: 'suggested',
      });
    }

    if (contextState.overdueTasks.length > 0) {
      suggestedItems.push({
        id: 'suggested-overdue-tasks',
        label: `View Overdue Tasks (${contextState.overdueTasks.length})`,
        icon: AlertTriangle,
        keywords: ['overdue', 'late tasks', 'past due', 'missed deadline'],
        action: () => setActiveView('tasks'),
        group: 'suggested',
      });
    }

    if (contextState.unreadCount > 0) {
      suggestedItems.push({
        id: 'suggested-notifications',
        label: `Check Notifications (${contextState.unreadCount} unread)`,
        icon: Bell,
        keywords: ['notifications', 'unread', 'alerts', 'inbox'],
        action: () => setNotificationPanelOpen(true),
        group: 'suggested',
      });
    }

    if (contextState.pendingRequests.length > 0) {
      suggestedItems.push({
        id: 'suggested-pending-requests',
        label: `Review Pending Requests (${contextState.pendingRequests.length})`,
        icon: FileText,
        keywords: ['pending requests', 'review requests', 'my requests'],
        action: () => setActiveView('requests'),
        group: 'suggested',
      });
    }

    // Time-based suggestions
    if (contextState.isMorning && contextState.isClockedIn) {
      suggestedItems.push({
        id: 'suggested-start-day',
        label: 'Start your day — check tasks',
        icon: Sparkles,
        keywords: ['start day', 'morning', 'begin', 'daily'],
        action: () => setActiveView('dashboard'),
        group: 'suggested',
      });
    }

    if (contextState.isAfternoon) {
      suggestedItems.push({
        id: 'suggested-check-tasks',
        label: 'Check your tasks for the afternoon',
        icon: ListTodo,
        keywords: ['afternoon', 'check tasks', 'task update'],
        action: () => setActiveView('tasks'),
        group: 'suggested',
      });
    }

    items.push(...suggestedItems);

    // ───── Recent actions (enhanced with repeat icon) ─────
    const recentActionItems: PaletteItem[] = recentActions.slice(0, 5).map((ra) => {
      // Map icon name back to component — fallback to Zap
      const iconMap: Record<string, LucideIcon> = {
        Clock, CalendarDays, ListTodo, FileText, MessageSquare, Bell, DollarSign,
        Settings, LayoutDashboard, Users, Scale, UsersRound, LogOut, Sun, Moon,
        Palette, Plus, FileSpreadsheet, Zap, BarChart3, Sparkles, Search,
        AlertTriangle, Timer, Sunrise, UserPlus, RotateCw,
      };
      const IconComponent = (ra.icon && iconMap[ra.icon]) || Zap;

      return {
        id: `recent-action-${ra.id}`,
        label: ra.label,
        icon: IconComponent,
        keywords: ['recent', 'repeat'],
        action: ra.action,
        group: 'recent-actions',
        timestamp: ra.timestamp,
        description: `Last action · ${timeAgo(ra.timestamp)}`,
      };
    });

    items.push(...recentActionItems);

    // ───── Navigation items ─────
    for (const nav of navRegistry) {
      items.push({
        id: `nav-${nav.id}`,
        label: nav.label,
        icon: nav.icon,
        keywords: nav.keywords,
        shortcut: nav.shortcut,
        action: () => setActiveView(nav.id),
        group: 'navigation',
      });
    }

    // ───── Users from store ─────
    for (const u of users.slice(0, 20)) {
      items.push({
        id: `user-${u.id}`,
        label: u.name,
        icon: Users,
        keywords: [u.email, u.department || '', u.role, u.position || ''],
        action: () => setActiveView('users'),
        group: 'users',
      });
    }

    // ───── Tasks from store ─────
    for (const task of tasks.slice(0, 20)) {
      items.push({
        id: `task-${task.id}`,
        label: task.title,
        icon: ListTodo,
        keywords: [task.status, task.priority, task.assigneeName || '', task.teamName || ''],
        action: () => setActiveView('tasks'),
        group: 'tasks',
      });
    }

    // ───── Quick actions (with enhanced natural language keywords) ─────
    const quickActions: PaletteItem[] = [
      {
        id: 'action-clock-in',
        label: 'Clock In / Out',
        icon: Clock,
        keywords: ['punch', 'attendance', 'check-in', ...(naturalLanguageKeywords['action-clock-in'] || []), ...(naturalLanguageKeywords['action-clock-out'] || [])],
        action: () => setClockInModalOpen(true),
        group: 'actions',
      },
      {
        id: 'action-apply-leave',
        label: 'Apply for Leave',
        icon: CalendarDays,
        keywords: ['vacation', 'time-off', ...(naturalLanguageKeywords['action-apply-leave'] || [])],
        shortcut: '⌘L',
        action: () => setActiveView('apply-leave'),
        group: 'actions',
      },
      {
        id: 'action-check-payslip',
        label: 'View Payslip',
        icon: DollarSign,
        keywords: ['salary', 'pay', 'compensation', ...(naturalLanguageKeywords['action-check-payslip'] || [])],
        shortcut: '⌘P',
        action: () => setActiveView('payroll'),
        group: 'actions',
      },
      {
        id: 'action-create-task',
        label: 'Create New Task',
        icon: Plus,
        keywords: ['add', 'new', 'todo'],
        action: () => setActiveView('tasks'),
        group: 'actions',
      },
      {
        id: 'action-new-request',
        label: 'Submit Request',
        icon: FileText,
        keywords: ['expense', 'asset', 'shift', ...(naturalLanguageKeywords['action-new-request'] || [])],
        action: () => setActiveView('submit-request'),
        group: 'actions',
      },
      {
        id: 'action-file-complaint',
        label: 'File Complaint',
        icon: MessageSquare,
        keywords: ['issue', 'report', 'grievance', ...(naturalLanguageKeywords['action-file-complaint'] || [])],
        action: () => setActiveView('submit-complaint'),
        group: 'actions',
      },
      {
        id: 'action-notifications',
        label: 'View Notifications',
        icon: Bell,
        keywords: ['alerts', 'inbox', ...(naturalLanguageKeywords['action-notifications'] || [])],
        shortcut: '⌘N',
        action: () => setNotificationPanelOpen(true),
        group: 'actions',
      },
      {
        id: 'action-my-tasks',
        label: 'My Tasks',
        icon: ListTodo,
        keywords: ['todo', 'kanban', ...(naturalLanguageKeywords['action-my-tasks'] || [])],
        shortcut: '⌘T',
        action: () => setActiveView('tasks'),
        group: 'actions',
      },
      {
        id: 'action-my-attendance',
        label: 'My Attendance',
        icon: Clock,
        keywords: ['records', 'history', ...(naturalLanguageKeywords['action-my-attendance'] || [])],
        action: () => setActiveView('attendance'),
        group: 'actions',
      },
      {
        id: 'action-check-leave-status',
        label: 'Check Leave Status',
        icon: CalendarDays,
        keywords: ['status', 'pending', ...(naturalLanguageKeywords['action-check-leave-status'] || [])],
        action: () => setActiveView('leaves'),
        group: 'actions',
      },
      {
        id: 'action-view-overdue-tasks',
        label: 'View Overdue Tasks',
        icon: AlertTriangle,
        keywords: ['overdue', 'late', ...(naturalLanguageKeywords['action-view-overdue-tasks'] || [])],
        action: () => setActiveView('tasks'),
        group: 'actions',
      },
      {
        id: 'action-toggle-theme',
        label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: theme === 'dark' ? Sun : Moon,
        keywords: ['appearance', 'dark', 'light', 'mode', 'theme'],
        action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        group: 'actions',
      },
      {
        id: 'action-toggle-sidebar',
        label: 'Toggle Sidebar',
        icon: Palette,
        keywords: ['collapse', 'expand', 'menu'],
        shortcut: '⌘B',
        action: () => toggleSidebar(),
        group: 'actions',
      },
      {
        id: 'action-export-payroll',
        label: 'Export Payroll',
        icon: FileSpreadsheet,
        keywords: ['csv', 'download', 'report'],
        action: () => setActiveView('payroll'),
        group: 'actions',
      },
      {
        id: 'action-keyboard-shortcuts',
        label: 'Keyboard Shortcuts',
        icon: Zap,
        keywords: ['help', 'hotkeys'],
        shortcut: '⌘/',
        action: () => toggleKeyboardShortcuts(),
        group: 'actions',
      },
      {
        id: 'action-logout',
        label: 'Log Out',
        icon: LogOut,
        keywords: ['sign-out', 'exit'],
        action: () => logout(),
        group: 'actions',
      },
    ];

    items.push(...quickActions);

    return items;
  }, [
    users,
    tasks,
    setActiveView,
    setClockInModalOpen,
    setNotificationPanelOpen,
    toggleSidebar,
    logout,
    setTheme,
    theme,
    toggleKeyboardShortcuts,
    recentActions,
    contextState,
    nlpResult,
    nlpLoading,
    executeNlpCommand,
  ]);

  /* Track searches */
  const handleSearchChange = useCallback(
    (value: string) => {
      if (value.trim().length > 2) {
        addRecentSearch(value.trim());
      }
    },
    [addRecentSearch]
  );

  const groupLabels: Record<string, string> = {
    suggested: '✨ Suggested',
    'recent-actions': '🕐 Recent Actions',
    navigation: 'Navigation',
    users: 'Users',
    tasks: 'Tasks',
    actions: 'Quick Actions',
  };

  const groupOrder = ['suggested', 'recent-actions', 'navigation', 'users', 'tasks', 'actions'];

  /* Group items */
  const groupedItems = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of allItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [allItems]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Command Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[15%] z-50 mx-auto max-w-xl"
          >
            <Command
              key={paletteKey}
              className="rounded-xl border border-border bg-background/90 backdrop-blur-xl shadow-2xl ring-1 ring-white/10"
              loop
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-border px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <CommandInput
                  value={searchValue}
                  onValueChange={(val) => {
                    setSearchValue(val);
                    handleSearchChange(val);
                  }}
                  placeholder="Type a command or search... (e.g. &quot;apply leave tomorrow&quot;)"
                  className="border-none focus:ring-0 h-11 text-sm"
                />
                {/* NLP loading spinner */}
                {nlpLoading && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="shrink-0"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </motion.div>
                )}
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0 text-[10px] font-mono text-muted-foreground ml-2">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <CommandList className="max-h-80 overflow-y-auto p-1">
                <CommandEmpty>
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground/60">Try a natural phrase like &quot;clock in&quot; or &quot;apply leave&quot;</p>
                  </div>
                </CommandEmpty>

                {groupOrder.map((groupKey) => {
                  const groupItems = groupedItems[groupKey];
                  if (!groupItems || groupItems.length === 0) return null;

                  // Only show suggested group when there are actual suggestions
                  if (groupKey === 'suggested' && groupItems.length === 0) return null;

                  return (
                    <CommandGroup key={groupKey} heading={groupLabels[groupKey]}>
                      {groupItems.map((item) => {
                        // Special rendering for NLP loading item
                        if (item.id === 'nlp-loading') {
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-60"
                            >
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <Sparkles className="h-4 w-4 text-amber-500" />
                              </motion.div>
                              <span className="flex-1 text-sm text-muted-foreground italic">{item.label}</span>
                              <span className="text-[10px] text-muted-foreground/50">{item.description}</span>
                            </div>
                          );
                        }

                        // Check if this is a recent action item (for repeat button)
                        const isRecentAction = item.group === 'recent-actions';

                        return (
                          <CommandItem
                            key={item.id}
                            value={`${item.label} ${(item.keywords || []).join(' ')}`}
                            onSelect={() => handleSelect(item)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent/50 transition-colors"
                          >
                            {/* NLP command gets a special icon style */}
                            {item.id === 'nlp-command' ? (
                              <motion.div
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                className="shrink-0"
                              >
                                <item.icon className="h-4 w-4 text-amber-500" />
                              </motion.div>
                            ) : (
                              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}

                            <div className="flex-1 min-w-0">
                              <span className="text-sm truncate block">{item.label}</span>
                              {item.description && item.id === 'nlp-command' && (
                                <span className="text-[10px] text-amber-500/70 block truncate">
                                  {item.description}
                                </span>
                              )}
                            </div>

                            {/* Recent actions: time ago + repeat button */}
                            {isRecentAction && item.timestamp && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-muted-foreground/60 font-mono">
                                  {timeAgo(item.timestamp)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    item.action();
                                    addRecentAction({
                                      id: item.id,
                                      label: item.label,
                                      action: item.action,
                                      icon: 'RotateCw',
                                    });
                                    toast.success(`Repeated: ${item.label}`);
                                    setCommandPaletteOpen(false);
                                    setPaletteKey((k) => k + 1);
                                  }}
                                  className="p-1 rounded-md hover:bg-accent/80 transition-colors text-muted-foreground hover:text-foreground"
                                  title="Repeat action"
                                >
                                  <RotateCw className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {/* Non-recent items: show timestamp (if any) or shortcut */}
                            {!isRecentAction && item.timestamp && (
                              <span className="text-[10px] text-muted-foreground/60 font-mono">
                                {timeAgo(item.timestamp)}
                              </span>
                            )}
                            {item.shortcut && (
                              <CommandShortcut className="text-[10px] font-mono">
                                {item.shortcut}
                              </CommandShortcut>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                })}

                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Recent Searches">
                      {recentSearches.slice(0, 5).map((search, i) => (
                        <CommandItem
                          key={`recent-${i}`}
                          value={search}
                          onSelect={() => handleSelect({
                            id: `search-${i}`,
                            label: search,
                            icon: Search,
                            action: () => {},
                            group: 'actions',
                          })}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                        >
                          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                          <span className="flex-1 text-sm text-muted-foreground truncate">{search}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>

              {/* Footer with enhanced keyboard shortcuts */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground/60">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">esc</kbd>
                    Close
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">⌘L</kbd>
                    Leave
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">⌘T</kbd>
                    Tasks
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">⌘P</kbd>
                    Payslip
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  EMS Command Bar
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
