'use client';

import { useEffect, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import type { ActiveView } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────

interface ShortcutDefinition {
  key: string;           // e.g. 'k', 'l', 't', 'p', etc.
  meta?: boolean;        // ⌘/Ctrl
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'data-entry' | 'system';
  global?: boolean;      // works even in input fields
}

// ─── Helper: build display string for a shortcut ──────────────────

function buildDisplayString(def: Omit<ShortcutDefinition, 'action' | 'description' | 'category' | 'global'>): string {
  const parts: string[] = [];
  if (def.meta) parts.push('⌘');
  if (def.shift) parts.push('⇧');
  if (def.alt) parts.push('⌥');
  parts.push(def.key.toUpperCase());
  return parts.join('');
}

// ─── Registry entry for the help dialog ───────────────────────────

export interface ShortcutRegistryEntry {
  keys: string;          // Display string like "⌘K"
  description: string;
  category: string;
  action: () => void;
}

// ─── Helper: toggle dark/light mode via DOM ───────────────────────
// Uses next-themes by directly toggling the class and localStorage,
// which works from any context (including the registry).

function toggleThemeViaDOM() {
  // next-themes stores the resolved theme in localStorage under the key 'theme'
  // and applies 'dark' class on <html>. We toggle both.
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  document.documentElement.classList.toggle('dark', next === 'dark');
  document.documentElement.style.colorScheme = next;
}

// ─── The hook ─────────────────────────────────────────────────────

export function useKeyboardShortcuts() {
  const store = useEMSStore();

  // ─── Stable action callbacks ──────────────────────────────────

  // Navigation
  const openCommandPalette = useCallback(() => {
    const { commandPaletteOpen, setCommandPaletteOpen } = useEMSStore.getState();
    setCommandPaletteOpen(!commandPaletteOpen);
  }, []);

  const goToDashboard = useCallback(() => {
    useEMSStore.getState().setActiveView('dashboard');
  }, []);

  const goToAttendance = useCallback(() => {
    useEMSStore.getState().setActiveView('attendance');
  }, []);

  const goToLeaves = useCallback(() => {
    useEMSStore.getState().setActiveView('leaves');
  }, []);

  const goToTasks = useCallback(() => {
    useEMSStore.getState().setActiveView('tasks');
  }, []);

  const goToPayroll = useCallback(() => {
    useEMSStore.getState().setActiveView('payroll');
  }, []);

  const openNotifications = useCallback(() => {
    useEMSStore.getState().setNotificationPanelOpen(true);
  }, []);

  const toggleSidebarAction = useCallback(() => {
    useEMSStore.getState().toggleSidebar();
  }, []);

  const toggleShortcutsHelp = useCallback(() => {
    useEMSStore.getState().toggleKeyboardShortcuts();
  }, []);

  // Quick Actions (⌘+Shift)
  const openClockInOutModal = useCallback(() => {
    useEMSStore.getState().setClockInModalOpen(true);
  }, []);

  const goToApplyLeave = useCallback(() => {
    useEMSStore.getState().setActiveView('apply-leave');
  }, []);

  const goToNewTask = useCallback(() => {
    // Navigate to tasks view — the task center handles new task creation internally
    const s = useEMSStore.getState();
    s.setActiveView('tasks');
  }, []);

  const goToSubmitRequest = useCallback(() => {
    useEMSStore.getState().setActiveView('submit-request');
  }, []);

  const goToSubmitComplaint = useCallback(() => {
    useEMSStore.getState().setActiveView('submit-complaint');
  }, []);

  // System
  const toggleDarkMode = useCallback(() => {
    toggleThemeViaDOM();
  }, []);

  const closeAll = useCallback(() => {
    const s = useEMSStore.getState();
    if (s.commandPaletteOpen) s.setCommandPaletteOpen(false);
    if (s.notificationPanelOpen) s.setNotificationPanelOpen(false);
    if (s.clockInModalOpen) s.setClockInModalOpen(false);
    if (s.keyboardShortcutsOpen) s.setKeyboardShortcutsOpen(false);
  }, []);

  // ─── Shortcut definitions ─────────────────────────────────────

  const shortcuts: ShortcutDefinition[] = [
    // Navigation (⌘+key)
    { key: 'k', meta: true, action: openCommandPalette, description: 'Open command palette', category: 'navigation', global: true },
    { key: '1', meta: true, action: goToDashboard, description: 'Go to Dashboard', category: 'navigation' },
    { key: '2', meta: true, action: goToAttendance, description: 'Go to Attendance', category: 'navigation' },
    { key: 'l', meta: true, action: goToLeaves, description: 'Go to Leaves', category: 'navigation' },
    { key: 't', meta: true, action: goToTasks, description: 'Go to Tasks', category: 'navigation' },
    { key: 'p', meta: true, action: goToPayroll, description: 'Go to Payroll', category: 'navigation' },
    { key: 'n', meta: true, action: openNotifications, description: 'Open Notifications panel', category: 'navigation' },
    { key: 'b', meta: true, action: toggleSidebarAction, description: 'Toggle sidebar', category: 'navigation' },
    { key: '/', meta: true, action: toggleShortcutsHelp, description: 'Keyboard shortcuts help', category: 'navigation', global: true },

    // Quick Actions (⌘+Shift+key)
    { key: 'c', meta: true, shift: true, action: openClockInOutModal, description: 'Clock in/out modal', category: 'actions', global: true },
    { key: 'l', meta: true, shift: true, action: goToApplyLeave, description: 'Apply for leave', category: 'actions', global: true },
    { key: 't', meta: true, shift: true, action: goToNewTask, description: 'Create new task', category: 'actions', global: true },
    { key: 'r', meta: true, shift: true, action: goToSubmitRequest, description: 'Submit request', category: 'actions', global: true },
    { key: 'f', meta: true, shift: true, action: goToSubmitComplaint, description: 'File complaint', category: 'actions', global: true },

    // Data Entry
    { key: 'Enter', meta: true, action: () => {
      // Submit the focused form — dispatch a submit event on the active form element
      const active = document.activeElement as HTMLElement;
      if (active) {
        const form = active.closest('form');
        if (form) {
          form.requestSubmit();
          return;
        }
      }
    }, description: 'Submit current form', category: 'data-entry', global: true },

    { key: 'Escape', action: closeAll, description: 'Close modal/panel/cancel', category: 'data-entry', global: true },

    // System
    { key: 'd', meta: true, shift: true, action: toggleDarkMode, description: 'Toggle dark/light mode', category: 'system', global: true },
    { key: 's', meta: true, shift: true, action: toggleSidebarAction, description: 'Toggle sidebar', category: 'system' },
  ];

  // ─── Keydown handler ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // When command palette is open, only allow Escape and ⌘K toggle
      const { commandPaletteOpen: cpOpen } = useEMSStore.getState();
      if (cpOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          useEMSStore.getState().setCommandPaletteOpen(false);
          return;
        }
        // Allow ⌘K to toggle off
        if (isMeta && e.key === 'k') {
          e.preventDefault();
          useEMSStore.getState().setCommandPaletteOpen(false);
          return;
        }
        return; // Don't process other shortcuts when command palette is open
      }

      // When keyboard shortcuts dialog is open, only allow Escape to close
      const { keyboardShortcutsOpen: ksOpen } = useEMSStore.getState();
      if (ksOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          useEMSStore.getState().setKeyboardShortcutsOpen(false);
          return;
        }
        return;
      }

      // Find a matching shortcut definition
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? isMeta : !isMeta;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && metaMatch && shiftMatch && altMatch) {
          // Skip if user is in an input field and the shortcut is not global
          if (isInput && !shortcut.global) continue;

          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }

      // Also support '?' key (no modifiers) to open shortcuts help — only when not in input
      if (e.key === '?' && !isMeta && !e.shiftKey && !e.altKey && !isInput) {
        e.preventDefault();
        toggleShortcutsHelp();
      }
    };

    document.addEventListener('keydown', handler, true); // capture phase to intercept before other handlers
    return () => document.removeEventListener('keydown', handler, true);
  }, [shortcuts, toggleShortcutsHelp]);

  // No return value — this hook is used for side effects only
}

// ─── Shortcut Registry (for the help dialog) ─────────────────────
// Uses useEMSStore.getState() so actions work without a React context.

export const shortcutRegistry: Array<ShortcutRegistryEntry> = [
  // Navigation
  { keys: '⌘K', description: 'Open command palette', category: 'Navigation', action: () => {
    const { commandPaletteOpen, setCommandPaletteOpen } = useEMSStore.getState();
    setCommandPaletteOpen(!commandPaletteOpen);
  }},
  { keys: '⌘1', description: 'Go to Dashboard', category: 'Navigation', action: () => {
    useEMSStore.getState().setActiveView('dashboard');
  }},
  { keys: '⌘2', description: 'Go to Attendance', category: 'Navigation', action: () => {
    useEMSStore.getState().setActiveView('attendance');
  }},
  { keys: '⌘L', description: 'Go to Leaves', category: 'Navigation', action: () => {
    useEMSStore.getState().setActiveView('leaves');
  }},
  { keys: '⌘T', description: 'Go to Tasks', category: 'Navigation', action: () => {
    useEMSStore.getState().setActiveView('tasks');
  }},
  { keys: '⌘P', description: 'Go to Payroll', category: 'Navigation', action: () => {
    useEMSStore.getState().setActiveView('payroll');
  }},
  { keys: '⌘N', description: 'Open Notifications panel', category: 'Navigation', action: () => {
    useEMSStore.getState().setNotificationPanelOpen(true);
  }},
  { keys: '⌘B', description: 'Toggle sidebar', category: 'Navigation', action: () => {
    useEMSStore.getState().toggleSidebar();
  }},
  { keys: '⌘/', description: 'Keyboard shortcuts help', category: 'Navigation', action: () => {
    useEMSStore.getState().toggleKeyboardShortcuts();
  }},

  // Quick Actions
  { keys: '⌘⇧C', description: 'Clock in/out modal', category: 'Quick Actions', action: () => {
    useEMSStore.getState().setClockInModalOpen(true);
  }},
  { keys: '⌘⇧L', description: 'Apply for leave', category: 'Quick Actions', action: () => {
    useEMSStore.getState().setActiveView('apply-leave');
  }},
  { keys: '⌘⇧T', description: 'Create new task', category: 'Quick Actions', action: () => {
    useEMSStore.getState().setActiveView('tasks');
  }},
  { keys: '⌘⇧R', description: 'Submit request', category: 'Quick Actions', action: () => {
    useEMSStore.getState().setActiveView('submit-request');
  }},
  { keys: '⌘⇧F', description: 'File complaint', category: 'Quick Actions', action: () => {
    useEMSStore.getState().setActiveView('submit-complaint');
  }},

  // Data Entry
  { keys: '⌘Enter', description: 'Submit current form', category: 'Data Entry', action: () => {
    const active = document.activeElement as HTMLElement;
    if (active) {
      const form = active.closest('form');
      if (form) form.requestSubmit();
    }
  }},
  { keys: 'Esc', description: 'Close modal/panel/cancel', category: 'Data Entry', action: () => {
    const s = useEMSStore.getState();
    if (s.commandPaletteOpen) s.setCommandPaletteOpen(false);
    if (s.notificationPanelOpen) s.setNotificationPanelOpen(false);
    if (s.clockInModalOpen) s.setClockInModalOpen(false);
    if (s.keyboardShortcutsOpen) s.setKeyboardShortcutsOpen(false);
  }},

  // System
  { keys: '⌘⇧D', description: 'Toggle dark/light mode', category: 'System', action: () => {
    toggleThemeViaDOM();
  }},
  { keys: '⌘⇧S', description: 'Toggle sidebar', category: 'System', action: () => {
    useEMSStore.getState().toggleSidebar();
  }},
];
