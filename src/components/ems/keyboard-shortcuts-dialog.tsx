'use client';

import { useEMSStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Keyboard,
  LayoutDashboard,
  Clock,
  CalendarDays,
  ListTodo,
  FileText,
  MessageSquare,
  DollarSign,
  BarChart3,
  Users,
  PanelLeftClose,
  Bell,
  Search,
  Sun,
  Plus,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ShortcutEntry {
  keys: string[];
  label: string;
  icon: LucideIcon;
}

const navigationShortcuts: ShortcutEntry[] = [
  { keys: ['⌘', 'K'], label: 'Command Palette', icon: Search },
  { keys: ['⌘', '1'], label: 'Dashboard', icon: LayoutDashboard },
  { keys: ['⌘', '2'], label: 'Attendance', icon: Clock },
  { keys: ['⌘', 'L'], label: 'Leaves', icon: CalendarDays },
  { keys: ['⌘', 'T'], label: 'Tasks', icon: ListTodo },
  { keys: ['⌘', 'P'], label: 'Payroll', icon: DollarSign },
  { keys: ['⌘', 'N'], label: 'Notifications', icon: Bell },
  { keys: ['⌘', 'B'], label: 'Toggle Sidebar', icon: PanelLeftClose },
  { keys: ['⌘', '/'], label: 'Keyboard Shortcuts', icon: Keyboard },
  { keys: ['?'], label: 'Show Shortcuts Help', icon: Zap },
  { keys: ['Esc'], label: 'Close Dialog / Palette', icon: Keyboard },
];

const quickActionShortcuts: ShortcutEntry[] = [
  { keys: ['⌘', '⇧', 'C'], label: 'Clock In / Out', icon: Clock },
  { keys: ['⌘', '⇧', 'L'], label: 'Apply for Leave', icon: CalendarDays },
  { keys: ['⌘', '⇧', 'T'], label: 'Create New Task', icon: Plus },
  { keys: ['⌘', '⇧', 'R'], label: 'Submit Request', icon: FileText },
  { keys: ['⌘', '⇧', 'F'], label: 'File Complaint', icon: MessageSquare },
];

const dataEntryShortcuts: ShortcutEntry[] = [
  { keys: ['⌘', 'Enter'], label: 'Submit Current Form', icon: Zap },
  { keys: ['Esc'], label: 'Cancel / Close Modal', icon: Keyboard },
];

const systemShortcuts: ShortcutEntry[] = [
  { keys: ['⌘', '⇧', 'D'], label: 'Toggle Dark / Light Mode', icon: Sun },
  { keys: ['⌘', '⇧', 'S'], label: 'Toggle Sidebar', icon: PanelLeftClose },
];

function ShortcutSection({ title, shortcuts: items, delayOffset = 0 }: {
  title: string;
  shortcuts: ShortcutEntry[];
  delayOffset?: number;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((shortcut, i) => (
          <motion.div
            key={shortcut.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (i + delayOffset) * 0.03 }}
            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <shortcut.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{shortcut.label}</span>
            </div>
            <div className="flex items-center gap-0.5">
              {shortcut.keys.map((key, ki) => (
                <kbd
                  key={ki}
                  className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono text-muted-foreground"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsDialog() {
  const { keyboardShortcutsOpen, setKeyboardShortcutsOpen } = useEMSStore();

  return (
    <Dialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Keyboard className="h-5 w-5 text-emerald-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Use these shortcuts to navigate and perform actions faster across the EMS workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4 max-h-[28rem] overflow-y-auto">
          <ShortcutSection title="Navigation" shortcuts={navigationShortcuts} delayOffset={0} />
          <Separator />
          <ShortcutSection title="Quick Actions" shortcuts={quickActionShortcuts} delayOffset={navigationShortcuts.length} />
          <Separator />
          <ShortcutSection title="Data Entry" shortcuts={dataEntryShortcuts} delayOffset={navigationShortcuts.length + quickActionShortcuts.length} />
          <Separator />
          <ShortcutSection title="System" shortcuts={systemShortcuts} delayOffset={navigationShortcuts.length + quickActionShortcuts.length + dataEntryShortcuts.length} />
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground/50">
          <span>Press <kbd className="rounded border border-border bg-muted px-1 py-0 font-mono">Esc</kbd> to close</span>
          <span className="flex items-center gap-1">
            <SparklesIcon className="h-3 w-3" />
            NLP Commands: type &quot;apply leave tomorrow&quot; in ⌘K
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
