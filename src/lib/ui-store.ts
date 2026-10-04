/**
 * UI Store — Zustand store for CLIENT-SIDE UI STATE ONLY.
 * Server data (departments, users, leaves, etc.) is now managed by TanStack Query hooks.
 *
 * What belongs here:
 *   - Auth state (user, token, isAuthenticated)
 *   - Navigation state (activeView)
 *   - Modal/panel open/close state
 *   - Sidebar collapsed state
 *   - Selection state (selectedTaskId, etc.)
 *   - Search/recent actions tracking
 *
 * What does NOT belong here:
 *   - Server-fetched data arrays (departments, users, leaves, tasks, etc.)
 *   - API action methods (clockIn, applyLeave, createTask, etc.)
 *   - Loading states for server data (use TanStack Query's isLoading instead)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, ActiveView, SystemSettings } from './types';
import { api } from './api-client';

interface UIStore {
  // ─── Auth ─────────────────────────────────────────────────────
  user: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // ─── Navigation ───────────────────────────────────────────────
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // ─── Sidebar ──────────────────────────────────────────────────
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // ─── Modals & Panels ─────────────────────────────────────────
  clockInModalOpen: boolean;
  setClockInModalOpen: (open: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  keyboardShortcutsOpen: boolean;
  toggleKeyboardShortcuts: () => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;

  // ─── Selection State ──────────────────────────────────────────
  selectedTaskId: string | null;
  selectedComplaintId: string | null;
  selectedRequestId: string | null;
  selectedLeaveId: string | null;
  selectedJobId: string | null;
  selectedCandidateId: string | null;
  selectedOnboardingId: string | null;
  selectedTrainingId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  setSelectedComplaintId: (id: string | null) => void;
  setSelectedRequestId: (id: string | null) => void;
  setSelectedLeaveId: (id: string | null) => void;
  setSelectedJobId: (id: string | null) => void;
  setSelectedCandidateId: (id: string | null) => void;
  setSelectedOnboardingId: (id: string | null) => void;
  setSelectedTrainingId: (id: string | null) => void;

  // ─── Search & Recent Actions ──────────────────────────────────
  recentSearches: string[];
  addRecentSearch: (search: string) => void;
  recentActions: Array<{ id: string; label: string; action: () => void; timestamp: number; icon?: string }>;
  addRecentAction: (action: { id: string; label: string; action: () => void; icon?: string }) => void;

  // ─── Pending Optimistic Actions ───────────────────────────────
  pendingActions: Record<string, boolean>;
  setPendingAction: (key: string, pending: boolean) => void;

  // ─── App Settings (cached locally) ────────────────────────────
  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => void;
}

const defaultSettings: SystemSettings = {
  timezone: 'UTC',
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  language: 'en',
  lateThreshold: 15,
  overtimeThreshold: 8,
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  fiscalYearStart: '1',
  holidays: [],
  modules: {
    attendance: true,
    leaves: true,
    tasks: true,
    requests: true,
    complaints: true,
    analytics: true,
    payroll: true,
    teams: true,
    departments: true,
  },
  security: {},
  notifications: {},
  organization: { companyName: 'Acme Corporation' },
  advanced: {},
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // ─── Auth ───────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      authToken: null,

      login: async (email: string, password: string) => {
        try {
          const data = await api.post<{ user: any; token: string }>('/api/auth', { email, password });
          const userData = data.user || data;
          const token = data.token || null;

          if (userData) {
            const user: User = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role?.toLowerCase() || 'employee',
              departmentId: userData.departmentId || '',
              department: userData.department?.name || '',
              avatar: userData.avatarUrl || '',
            };
            set({ user, isAuthenticated: true, authToken: token });
            return true;
          }
          return false;
        } catch {
          // Offline fallback: demo login
          const demoUsers: Record<string, User> = {
            'admin@ems.com': { id: 'demo-admin', name: 'Alex Morgan', email: 'admin@ems.com', role: 'admin', departmentId: 'demo-eng', department: 'Engineering', avatar: '' },
            'manager@ems.com': { id: 'demo-manager', name: 'Sarah Chen', email: 'manager@ems.com', role: 'manager', departmentId: 'demo-eng', department: 'Engineering', avatar: '' },
            'james@ems.com': { id: 'demo-emp', name: 'James Wilson', email: 'james@ems.com', role: 'employee', departmentId: 'demo-eng', department: 'Engineering', avatar: '' },
          };
          const demoUser = demoUsers[email];
          if (demoUser && (password === 'admin123' || password === 'manager123' || password === 'emp123')) {
            set({ user: demoUser, isAuthenticated: true, authToken: null });
            return true;
          }
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          authToken: null,
          activeView: 'dashboard',
          selectedTaskId: null,
          selectedComplaintId: null,
          selectedRequestId: null,
          selectedLeaveId: null,
          selectedJobId: null,
          selectedCandidateId: null,
          selectedOnboardingId: null,
          selectedTrainingId: null,
          commandPaletteOpen: false,
          keyboardShortcutsOpen: false,
          recentSearches: [],
          recentActions: [],
          pendingActions: {},
        });
      },

      // ─── Navigation ────────────────────────────────────
      activeView: 'dashboard',
      setActiveView: (view) => set({ activeView: view }),

      // ─── Sidebar ───────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // ─── Modals & Panels ───────────────────────────────
      clockInModalOpen: false,
      setClockInModalOpen: (open) => set({ clockInModalOpen: open }),
      notificationPanelOpen: false,
      setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
      commandPaletteOpen: false,
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      keyboardShortcutsOpen: false,
      toggleKeyboardShortcuts: () => set((s) => ({ keyboardShortcutsOpen: !s.keyboardShortcutsOpen })),
      setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),

      // ─── Selection State ───────────────────────────────
      selectedTaskId: null,
      selectedComplaintId: null,
      selectedRequestId: null,
      selectedLeaveId: null,
      selectedJobId: null,
      selectedCandidateId: null,
      selectedOnboardingId: null,
      selectedTrainingId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),
      setSelectedRequestId: (id) => set({ selectedRequestId: id }),
      setSelectedLeaveId: (id) => set({ selectedLeaveId: id }),
      setSelectedJobId: (id) => set({ selectedJobId: id }),
      setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),
      setSelectedOnboardingId: (id) => set({ selectedOnboardingId: id }),
      setSelectedTrainingId: (id) => set({ selectedTrainingId: id }),

      // ─── Search & Recent Actions ───────────────────────
      recentSearches: [],
      addRecentSearch: (search) =>
        set((s) => ({
          recentSearches: [search, ...s.recentSearches.filter((r) => r !== search)].slice(0, 10),
        })),
      recentActions: [],
      addRecentAction: (action) =>
        set((s) => ({
          recentActions: [{ ...action, timestamp: Date.now() }, ...s.recentActions].slice(0, 20),
        })),

      // ─── Pending Actions ───────────────────────────────
      pendingActions: {},
      setPendingAction: (key, pending) =>
        set((s) => ({
          pendingActions: { ...s.pendingActions, [key]: pending },
        })),

      // ─── Settings (cached) ─────────────────────────────
      settings: defaultSettings,
      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
    }),
    {
      name: 'ems-ui-store',
      partialize: (state) => ({
        // Only persist auth and preferences — never persist server data
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        authToken: state.authToken,
        activeView: state.activeView,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings,
      }),
    }
  )
);

/**
 * Backwards-compatible re-export so existing code `useEMSStore` still works.
 * The old store imported from `@/lib/store` is now deprecated.
 * New code should use `useUIStore` for UI state and TanStack Query hooks for server data.
 */
export { useUIStore as useEMSStore };
