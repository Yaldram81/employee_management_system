import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Department, AttendanceRecord, AttendanceLog, Shift, Leave, Task, Request, Complaint, Notification, NotificationActionData, SystemRule, PayrollRecord, SalaryStructure, PayrollDashboardData, AnalyticsData, SystemSettings, ActiveView, LeaveBalance, AdminAttendanceData, AdminLeaveData, LeavePolicy, CompanyHoliday, Team, TeamMemberRecord, TaskComment, TaskTemplate, AdminTMSData, ManagerLeaveData, ManagerTaskData } from './types';

interface EMSStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Data
  departments: Department[];
  users: User[];
  attendance: AttendanceRecord[];
  attendanceLogs: AttendanceLog[];
  shifts: Shift[];
  leaves: Leave[];
  tasks: Task[];
  requests: Request[];
  complaints: Complaint[];
  notifications: Notification[];
  rules: SystemRule[];
  settings: SystemSettings;
  payroll: PayrollRecord[];
  salaryStructures: SalaryStructure[];
  payrollDashboard: PayrollDashboardData | null;
  payrollLoading: boolean;
  analytics: AnalyticsData | null;
  leaveBalance: LeaveBalance | null;

  // Data loading
  loadData: (userId: string, role: string) => Promise<void>;
  loadRequests: () => Promise<void>;

  // UI state
  isLoading: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  clockInModalOpen: boolean;
  setClockInModalOpen: (open: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  recentSearches: string[];
  addRecentSearch: (search: string) => void;
  keyboardShortcutsOpen: boolean;
  toggleKeyboardShortcuts: () => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;

  // Optimistic update tracking
  pendingActions: Record<string, boolean>;
  setPendingAction: (key: string, pending: boolean) => void;

  // HRM detail selection state
  selectedJobId: string | null;
  selectedCandidateId: string | null;
  selectedOnboardingId: string | null;
  selectedTrainingId: string | null;
  setSelectedJobId: (id: string | null) => void;
  setSelectedCandidateId: (id: string | null) => void;
  setSelectedOnboardingId: (id: string | null) => void;
  setSelectedTrainingId: (id: string | null) => void;

  // Employee detail selection state
  selectedTaskId: string | null;
  selectedComplaintId: string | null;
  selectedRequestId: string | null;
  selectedLeaveId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  setSelectedComplaintId: (id: string | null) => void;
  setSelectedRequestId: (id: string | null) => void;
  setSelectedLeaveId: (id: string | null) => void;

  // Admin attendance command center state
  adminAttendanceData: AdminAttendanceData | null;
  adminAttendanceLoading: boolean;
  loadAdminAttendanceData: (date?: string) => Promise<void>;
  ghostClockOut: (date: string, defaultTime: string) => Promise<void>;
  resolveMissedPunch: (userId: string, punchType: string, time: string, date: string, note?: string) => Promise<void>;
  adminOverrideAttendance: (attendanceId: string, updates: Record<string, unknown>) => Promise<void>;
  manualAttendance: (userId: string, status: string, clockIn?: string, clockOut?: string, note?: string, date?: string) => Promise<void>;
  bulkManualAttendance: (userIds: string[], status: string, clockIn?: string, clockOut?: string, note?: string, date?: string) => Promise<void>;

  // Admin leave management state
  adminLeaveData: AdminLeaveData | null;
  adminLeaveLoading: boolean;
  loadAdminLeaveData: () => Promise<void>;
  toggleLeaveLockdown: () => Promise<void>;
  overrideLeaveBalance: (userId: string, leaveType: string, delta: number, reason?: string) => Promise<void>;
  createLeavePolicy: (policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'isActive'>) => Promise<void>;
  updateLeavePolicy: (id: string, updates: Partial<LeavePolicy>) => Promise<void>;
  createCompanyHoliday: (holiday: Omit<CompanyHoliday, 'id'>) => Promise<void>;
  deleteCompanyHoliday: (id: string) => Promise<void>;
  yearEndRollover: () => Promise<void>;

  // Manager leave management state
  managerLeaveData: ManagerLeaveData | null;
  managerLeaveLoading: boolean;
  loadManagerLeaveData: () => Promise<void>;
  bulkApproveLeaves: (leaveIds: string[], status: 'approved' | 'rejected', comment?: string) => Promise<void>;
  approveLeaveSingle: (id: string, status: 'approved' | 'rejected', comment: string) => Promise<void>;
  cancelTeamLeave: (id: string, reason: string) => Promise<void>;
  modifyTeamLeave: (id: string, changes: { startDate?: string; endDate?: string; type?: string; reason?: string }, reason: string) => Promise<void>;
  delegateLeaveApproval: (id: string, delegateToManagerId: string, comment: string) => Promise<void>;
  requestLeaveDocument: (id: string, message: string) => Promise<void>;
  markReturnToWork: (id: string, notes: string) => Promise<void>;
  carryForwardLeave: (userId: string, leaveType: string, days: number, comment: string) => Promise<void>;
  encashLeave: (userId: string, leaveType: string, days: number, comment: string) => Promise<void>;
  getTeamAvailability: (startDate: string, endDate: string) => Promise<any>;
  getLeaveReport: (startDate: string, endDate: string) => Promise<any>;

  // Manager task management state
  managerTaskData: ManagerTaskData | null;
  managerTaskLoading: boolean;
  loadManagerTaskData: () => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], updates: any) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  approveTask: (taskId: string, score?: number, comment?: string) => Promise<void>;
  requestTaskChanges: (taskId: string, comment: string) => Promise<void>;
  reassignTask: (taskId: string, assigneeId: string, reason?: string) => Promise<void>;
  resolveTaskBlocker: (taskId: string, comment?: string) => Promise<void>;

  // Team & TMS state
  teams: Team[];
  adminTMSData: AdminTMSData | null;
  adminTMSLoading: boolean;
  taskComments: TaskComment[];
  taskTemplates: TaskTemplate[];
  loadTeams: () => Promise<void>;
  createTeam: (name: string, description: string, members: Array<{userId: string; role: string}>, opts?: { departmentId?: string; color?: string }) => Promise<void>;
  updateTeam: (id: string, updates: {name?: string; description?: string; color?: string; departmentId?: string | null; addMembers?: Array<{userId: string; role: string}>; removeMembers?: string[]}) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  loadAdminTMSData: () => Promise<void>;
  createEpic: (title: string, description: string, subTasks: Array<{title: string; assigneeId?: string; priority: string; dueDate?: string}>) => Promise<void>;
  applyTemplate: (templateId: string, userId: string) => Promise<void>;
  reviewTask: (taskId: string, action: 'approve' | 'request-changes', comment?: string) => Promise<void>;
  loadTaskComments: (taskId: string) => Promise<void>;
  addTaskComment: (taskId: string, comment: string) => Promise<void>;
  loadTaskTemplates: () => Promise<void>;
  createTaskTemplate: (template: {name: string; description?: string; category: string; taskItems: string}) => Promise<void>;

  // Actions
  clockIn: (method: 'face' | 'pin', gpsData?: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  clockInWithFace: (imageBase64: string, gpsData?: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  clockInWithPin: (pin: string, gpsData?: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  startBreak: (gpsData?: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  endBreak: (gpsData?: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  manualPunch: (userId: string, punchType: string, time: string) => Promise<void>;
  recalculateAttendance: (date: string) => Promise<void>;
  applyLeave: (leave: Omit<Leave, 'id' | 'status' | 'createdAt' | 'userName'>) => Promise<void>;
  approveLeave: (id: string, status: 'approved' | 'rejected', comment?: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createRequest: (request: Omit<Request, 'id' | 'status' | 'createdAt' | 'userName'>) => Promise<void>;
  updateRequest: (id: string, status: Request['status'], comment?: string) => Promise<void>;
  createComplaint: (complaint: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'userName' | 'resolvedBy' | 'resolverName' | 'resolvedAt' | 'escalatorName' | 'closedAt' | 'assigneeName'>) => Promise<void>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  executeNotificationAction: (notificationId: string, action: 'approve' | 'reject' | 'acknowledge', comment?: string) => Promise<void>;

  // Recent actions tracking
  recentActions: Array<{ id: string; label: string; action: () => void; timestamp: number; icon?: string }>;
  addRecentAction: (action: { id: string; label: string; action: () => void; icon?: string }) => void;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  createRule: (rule: Omit<SystemRule, 'id' | 'createdAt'>) => Promise<void>;
  updateRule: (id: string, updates: Partial<SystemRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  generatePayroll: (month: string, departmentId?: string) => Promise<void>;
  updatePayroll: (id: string, updates: Partial<PayrollRecord>) => Promise<void>;
  bulkPayrollAction: (ids: string[], action: string) => Promise<void>;
  loadPayrollDashboard: () => Promise<void>;
  loadSalaryStructures: () => Promise<void>;
  createSalaryStructure: (structure: Omit<SalaryStructure, 'id' | 'createdAt' | 'updatedAt' | 'userName' | 'userEmail' | 'userDepartment'>) => Promise<void>;
  updateSalaryStructure: (id: string, updates: Partial<SalaryStructure>) => Promise<void>;
  editPayrollRecord: (id: string, updates: Record<string, unknown>) => Promise<void>;

  // Department management
  createDepartment: (data: { name: string; description?: string; color?: string; icon?: string; location?: string; budget?: number; managerId?: string }) => Promise<void>;
  updateDepartment: (id: string, updates: Record<string, unknown>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  loadDepartments: () => Promise<void>;

  // User management
  createUser: (data: { name: string; email: string; password: string; role?: string; departmentId?: string; phone?: string; position?: string; workMode?: string; salary?: number; joinDate?: string }) => Promise<void>;
  updateUser: (id: string, updates: Record<string, unknown>) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
  loadUsers: () => Promise<void>;

  // Shift management
  loadShifts: () => Promise<void>;
  createShift: (data: { name: string; startTime: string; endTime: string; gracePeriod?: number; halfDayMin?: number; overtimeThreshold?: number; isDefault?: boolean; color?: string }) => Promise<void>;
  updateShift: (id: string, updates: Record<string, unknown>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  assignEmployeeToShift: (userId: string, shiftId: string | null) => Promise<void>;
  bulkAssignShift: (userIds: string[], shiftId: string) => Promise<void>;
}

function normalizeStr(val: unknown): string {
  if (typeof val === 'string') return val.toLowerCase().replace(/_/g, '-');
  return '';
}

// Module-scope normalizers so they can be reused outside loadData
const normalizeComplaints = (data: any[]): Complaint[] => (data || []).map((c: any) => ({
  id: c.id,
  userId: c.userId || '',
  userName: c.user?.name || (c.isAnonymous ? 'Anonymous' : ''),
  userEmail: c.user?.email || '',
  userDepartment: c.user?.department?.name || '',
  subject: c.subject,
  description: c.description,
  category: normalizeStr(c.category || 'GENERAL') as Complaint['category'],
  priority: normalizeStr(c.priority || 'MEDIUM') as Complaint['priority'],
  status: normalizeStr(c.status) as Complaint['status'],
  isAnonymous: c.isAnonymous,
  resolution: c.resolutionNotes || undefined,
  resolvedBy: c.resolvedById || undefined,
  resolverName: c.resolver?.name || undefined,
  resolvedAt: c.resolvedAt || undefined,
  departmentId: c.departmentId || undefined,
  departmentName: c.department?.name || c.user?.department?.name || undefined,
  assignedToId: c.assignedToId || undefined,
  assigneeName: c.assignee?.name || undefined,
  escalatedAt: c.escalatedAt || undefined,
  escalatedBy: c.escalatedById || undefined,
  escalatorName: c.escalator?.name || undefined,
  closedAt: c.closedAt || undefined,
  dueDate: c.dueDate || undefined,
  attachmentUrls: (() => { try { return c.attachmentUrls ? JSON.parse(c.attachmentUrls) : undefined; } catch { return undefined; } })(),
  severity: normalizeStr(c.severity || 'NORMAL') as Complaint['severity'],
  createdAt: c.createdAt,
  updatedAt: c.updatedAt || undefined,
}));

const normalizeLeaves = (data: any[]): Leave[] => (data || []).map((l: any) => ({
  id: l.id,
  userId: l.userId,
  userName: l.user?.name || '',
  type: normalizeStr(l.type) as Leave['type'],
  startDate: l.startDate,
  endDate: l.endDate,
  reason: l.reason,
  status: normalizeStr(l.status) as Leave['status'],
  managerId: l.managerId || undefined,
  managerComment: l.managerComment || undefined,
  createdAt: l.createdAt,
}));

const normalizeAttendance = (data: any[]): AttendanceRecord[] => (data || []).map((a: any) => ({
  id: a.id,
  userId: a.userId,
  userName: a.user?.name || '',
  date: a.date,
  firstIn: a.firstIn || a.clockIn || undefined,
  lastOut: a.lastOut || a.clockOut || undefined,
  clockIn: a.clockIn || a.firstIn || undefined,
  clockOut: a.clockOut || a.lastOut || undefined,
  totalHours: a.totalHours ?? undefined,
  breakMinutes: a.breakMinutes ?? undefined,
  breakHours: a.breakHours ?? (a.breakMinutes ? a.breakMinutes / 60 : undefined),
  netWorkHours: a.netWorkHours ?? ((a.totalHours != null && a.breakMinutes) ? Math.max(0, a.totalHours - a.breakMinutes / 60) : undefined),
  status: normalizeStr(a.status) as AttendanceRecord['status'],
  method: normalizeStr(a.method) as AttendanceRecord['method'],
  overtimeHours: a.overtimeHours ?? undefined,
  workMode: a.workMode || undefined,
  gpsLatitude: a.gpsLatitude ?? undefined,
  gpsLongitude: a.gpsLongitude ?? undefined,
  locationName: a.locationName || undefined,
  isGeofenceOk: a.isGeofenceOk ?? undefined,
  isEdited: a.isEdited ?? undefined,
  editedBy: a.editedBy || undefined,
  note: a.note || undefined,
}));

const normalizeAttendanceLogs = (data: any[]): AttendanceLog[] => (data || []).map((l: any) => ({
  id: l.id,
  userId: l.userId,
  userName: l.user?.name || '',
  punchType: normalizeStr(l.punchType) as AttendanceLog['punchType'],
  punchTime: l.punchTime,
  method: normalizeStr(l.method) as AttendanceLog['method'],
  confidence: l.confidence ?? undefined,
  ipAddress: l.ipAddress || undefined,
  gpsLatitude: l.gpsLatitude ?? undefined,
  gpsLongitude: l.gpsLongitude ?? undefined,
  gpsAccuracy: l.gpsAccuracy ?? undefined,
  locationName: l.locationName || undefined,
  deviceId: l.deviceId || undefined,
  isFlagged: l.isFlagged ?? false,
  flagReason: l.flagReason || undefined,
  isBreak: l.isBreak ?? false,
  editedBy: l.editedBy || undefined,
  createdAt: l.createdAt,
}));

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

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  // Attach auth token to every request for role verification
  const token = useEMSStore.getState().authToken;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      if (res.status === 401) {
        const state = useEMSStore.getState();
        // Only force logout if we had a real server-issued token
        if (state.isAuthenticated && state.authToken) {
          state.logout();
        }
        throw new Error('Session expired');
      }
      // For 403 (insufficient permissions), just throw — don't logout
      if (res.status === 403) {
        throw new Error('Insufficient permissions');
      }
      // For 502/503/504, the gateway may be returning HTML — don't try to parse
      if (res.status >= 502) {
        throw new Error(`Server unavailable (${res.status})`);
      }
      throw new Error(`API error: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }
    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  } catch (err) {
    // Network errors (server down, connection refused)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Network error — server may be restarting');
    }
    throw err;
  }
}

function normalizeRequestsData(data: any[]): Request[] {
  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.userName || '',
    userEmail: r.user?.email || r.userEmail || '',
    userDepartment: r.user?.department?.name || r.userDepartment || '',
    type: normalizeStr(r.type) as Request['type'],
    title: r.title || (() => { try { return JSON.parse(r.payload || '{}').title || r.type || ''; } catch { return r.type || ''; } })(),
    description: r.description || (() => { try { const p = JSON.parse(r.payload || '{}'); return p.description || ''; } catch { return ''; } })(),
    status: normalizeStr(r.status) as Request['status'],
    priority: normalizeStr(r.priority || 'MEDIUM') as Request['priority'],
    reviewedBy: r.reviewerId || r.reviewedBy || undefined,
    reviewerName: r.reviewer?.name || r.reviewerName || undefined,
    reviewComment: r.reviewComment || undefined,
    amount: r.amount ?? (() => { try { return JSON.parse(r.payload || '{}').amount; } catch { return undefined; } })(),
    departmentId: r.departmentId || undefined,
    departmentName: r.department?.name || r.user?.department?.name || r.departmentName || undefined,
    dueDate: r.dueDate || undefined,
    attachmentUrls: (() => { try { return r.attachmentUrls ? JSON.parse(r.attachmentUrls) : undefined; } catch { return undefined; } })(),
    resolvedAt: r.resolvedAt || undefined,
    cancelledAt: r.cancelledAt || undefined,
    escalatedAt: r.escalatedAt || undefined,
    escalatedBy: r.escalatedBy || undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt || undefined,
  }));
}

export const useEMSStore = create<EMSStore>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      authToken: null,
      login: async (email: string, password: string) => {
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) return false;
          const json = await res.json();
          const userData = json.data?.user || json.data || json.user;
          const token = json.data?.token || json.token || null;
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
            // Load data in background - don't block login
            get().loadData(user.id, user.role).catch((err) => {
              console.warn('Background data load failed, will retry:', err);
            });
            return true;
          }
          return false;
        } catch {
          // If API call fails (server down), try client-side demo login
          const demoUsers: Record<string, User> = {
            'admin@ems.com': { id: 'demo-admin', name: 'Alex Morgan', email: 'admin@ems.com', role: 'admin', departmentId: 'demo-eng', department: 'Engineering', avatar: '' },
            'manager@ems.com': { id: 'demo-manager', name: 'Sarah Chen', email: 'manager@ems.com', role: 'manager', departmentId: 'demo-eng', department: 'Engineering', avatar: '' },
            'james@ems.com': { id: 'demo-emp', name: 'James Wilson', email: 'james@ems.com', role: 'employee', departmentId: 'demo-eng', department: 'Engineering', avatar: '' },
          };
          const demoUser = demoUsers[email];
          if (demoUser && (password === 'admin123' || password === 'manager123' || password === 'emp123')) {
            set({ user: demoUser, isAuthenticated: true, authToken: null });
            // Try loading data in background
            get().loadData(demoUser.id, demoUser.role).catch(() => {});
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
          departments: [],
          users: [],
          attendance: [],
          attendanceLogs: [],
          shifts: [],
          leaves: [],
          tasks: [],
          requests: [],
          complaints: [],
          notifications: [],
          rules: [],
          payroll: [],
          salaryStructures: [],
          payrollDashboard: null,
          payrollLoading: false,
          analytics: null,
          leaveBalance: null,
          adminAttendanceData: null,
          adminLeaveData: null,
          managerLeaveData: null,
          managerTaskData: null,
          teams: [],
          adminTMSData: null,
          taskComments: [],
          taskTemplates: [],
          commandPaletteOpen: false,
          recentSearches: [],
          keyboardShortcutsOpen: false,
          pendingActions: {},
          selectedJobId: null,
          selectedCandidateId: null,
          selectedOnboardingId: null,
          selectedTrainingId: null,
          selectedTaskId: null,
          selectedComplaintId: null,
          selectedRequestId: null,
          recentActions: [],
        });
      },

      // Navigation
      activeView: 'dashboard',
      setActiveView: (view) => {
        set({ activeView: view });
        if (typeof window !== 'undefined') {
          const target = view === 'dashboard' ? '/dashboard' : `/${view}`;
          if (window.location.pathname !== target && window.location.pathname !== '/login') {
            window.history.pushState({ view }, '', target);
          }
        }
      },

      // Data
      departments: [],
      users: [],
      attendance: [],
      attendanceLogs: [],
      shifts: [],
      leaves: [],
      tasks: [],
      requests: [],
      complaints: [],
      notifications: [],
      rules: [],
      settings: defaultSettings,
      payroll: [],
      salaryStructures: [],
      payrollDashboard: null,
      payrollLoading: false,
      analytics: null,
      leaveBalance: null,
      teams: [],
      adminTMSData: null,
      adminTMSLoading: false,
      taskComments: [],
      taskTemplates: [],

      loadData: async (userId: string, role: string) => {
        set({ isLoading: true });
        const safeFetch = async <T>(url: string, fallback: T): Promise<T> => {
          try {
            return await apiFetch<T>(url);
          } catch {
            return fallback;
          }
        };

        try {
          const params = new URLSearchParams({ userId, role });
          const isAdmin = role === 'admin';
          const isManager = role === 'manager';
          const isEmployee = role === 'employee';

          // --- Normalization functions ---
          // normalizeAttendance, normalizeAttendanceLogs, normalizeLeaves are at module scope
          // normalizeComplaints and normalizeRequestsData are at module scope

          const normalizeShifts = (data: any[]): Shift[] => (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            gracePeriod: s.gracePeriod ?? 15,
            halfDayMin: s.halfDayMin ?? 4,
            overtimeThreshold: s.overtimeThreshold ?? 8,
            isDefault: s.isDefault ?? false,
            color: s.color || '#10b981',
            employeeCount: s.employeeCount ?? s._count?.users ?? 0,
          }));

          const normalizeTasks = (data: any[]): Task[] => (data || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description || undefined,
            status: normalizeStr(t.status) as Task['status'],
            priority: normalizeStr(t.priority) as Task['priority'],
            assigneeId: t.assigneeId || undefined,
            assigneeName: t.assignee?.name || undefined,
            reporterId: t.reporterId || undefined,
            reporterName: t.reporter?.name || undefined,
            departmentId: t.departmentId || undefined,
            teamId: t.teamId || undefined,
            teamName: t.team?.name || undefined,
            parentTaskId: t.parentTaskId || undefined,
            isBlocked: t.isBlocked ?? false,
            blockedReason: t.blockedReason || undefined,
            performanceScore: t.performanceScore || undefined,
            completedAt: t.completedAt || undefined,
            dueDate: t.dueDate || undefined,
            createdAt: t.createdAt,
            subTasks: t.subTasks ? normalizeTasks(t.subTasks) : undefined,
            commentCount: t._count?.comments ?? t.commentCount ?? 0,
            comments: t.comments || undefined,
          }));

          const normalizeRequests = normalizeRequestsData;

          // normalizeComplaints is now at module scope

          const normalizeNotifications = (data: any[]): Notification[] => (data || []).map((n: any) => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            type: normalizeStr(n.type) as Notification['type'],
            isRead: n.isRead,
            link: n.actionUrl || undefined,
            actionData: (() => { try { return n.actionData ? JSON.parse(n.actionData) : undefined; } catch { return undefined; } })(),
            createdAt: n.createdAt,
          }));

          const normalizeUsers = (data: any[]): User[] => (data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: normalizeStr(u.role) as User['role'],
            departmentId: u.departmentId || '',
            department: u.department?.name || '',
            avatar: u.avatarUrl || '',
            phone: u.phone || undefined,
            position: u.position || undefined,
            joinDate: u.joinDate || u.createdAt || undefined,
            salary: u.salary || undefined,
            isActive: u.isActive ?? true,
            workMode: normalizeStr(u.workMode || 'OFFICE'),
            shiftId: u.shiftId || undefined,
            shiftName: u.shift?.name || undefined,
          }));

          const normalizeDepartments = (data: any[]): Department[] => (data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description || undefined,
            color: d.color || undefined,
            icon: d.icon || undefined,
            location: d.location || undefined,
            budget: d.budget || undefined,
            managerId: d.managerId || undefined,
            managerName: d.manager?.name || '',
            employeeCount: d._count?.users || d.users?.length || 0,
            isActive: d.isActive ?? true,
            createdAt: d.createdAt || undefined,
            teamCount: d._count?.teams || 0,
          }));

          const normalizePayroll = (data: any[], usersList: any[]): PayrollRecord[] => (data || []).map((p: any) => {
            const u = usersList.find((u2: any) => u2.id === p.userId);
            const rawUser = p.user || u || {};
            return {
              id: p.id,
              userId: p.userId,
              userName: rawUser.name || '',
              userEmail: rawUser.email || '',
              userDepartment: rawUser.department?.name || '',
              userPosition: rawUser.position || '',
              month: p.month,
              baseSalary: p.baseSalary,
              overtime: p.overtime ?? 0,
              allowances: p.allowances ?? 0,
              bonus: p.bonus ?? 0,
              tax: p.tax ?? 0,
              insurance: p.insurance ?? 0,
              providentFund: p.providentFund ?? 0,
              otherDeductions: p.otherDeductions ?? 0,
              deductions: p.deductions ?? 0,
              grossSalary: p.grossSalary ?? (p.baseSalary + (p.overtime ?? 0) + (p.allowances ?? 0) + (p.bonus ?? 0)),
              netSalary: p.netSalary,
              status: (() => {
                const s = normalizeStr(p.status);
                if (s === 'draft') return 'draft' as PayrollRecord['status'];
                if (s === 'on-hold') return 'on-hold' as PayrollRecord['status'];
                return s as PayrollRecord['status'];
              })(),
              paymentMethod: normalizeStr(p.paymentMethod || 'BANK_TRANSFER') as PayrollRecord['paymentMethod'],
              bankName: p.bankName || undefined,
              bankAccount: p.bankAccount || undefined,
              notes: p.notes || undefined,
              reviewedBy: p.reviewedById || undefined,
              reviewerName: p.reviewer?.name || undefined,
              reviewedAt: p.reviewedAt || undefined,
              approvedBy: p.approvedById || undefined,
              approverName: p.approver?.name || undefined,
              approvedAt: p.approvedAt || undefined,
              generatedAt: p.generatedAt,
              paidAt: p.paidAt || undefined,
              createdAt: p.createdAt || undefined,
              updatedAt: p.updatedAt || undefined,
            };
          });

          const normalizeRules = (data: any[]): SystemRule[] => (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            description: `${r.triggerEvent} → ${r.action}`,
            condition: `Occurs ${r.conditionCount} time(s)`,
            action: r.action,
            isActive: r.isActive,
            createdAt: r.createdAt,
          }));

          // ============================================================
          // Phase 1: Core essential data — PARALLEL fetch, no delays
          // Role-based scoping: employees get scoped departments + colleagues
          // Managers get department-scoped users; admins get everything
          // ============================================================

          const phase1Promises: Promise<any>[] = [
            safeFetch<Department[]>(isEmployee ? '/api/departments?scope=mine' : '/api/departments', []),
            safeFetch<User[]>(isEmployee ? `/api/users?scope=colleagues&userId=${userId}` : (isManager ? `/api/users?userId=${userId}` : '/api/users'), []),
            safeFetch<Shift[]>('/api/shifts', []),
            safeFetch<SystemRule[]>('/api/rules', []),
          ];
          const [rawDepartments, rawUsers, rawShifts, rawRules] = await Promise.all(phase1Promises);

          const normDepts = normalizeDepartments(rawDepartments);
          const normUsers = normalizeUsers(rawUsers);
          const normShifts = normalizeShifts(rawShifts);
          const normRules = normalizeRules(rawRules);

          // Set core data and mark loading as done so UI renders immediately
          set({
            departments: normDepts,
            users: normUsers,
            shifts: normShifts,
            rules: normRules,
            isLoading: false,
          });

          // ============================================================
          // Phase 2: User-specific data — PARALLEL fetch, no delays
          // Only fetch payroll for admin; employees get own payroll
          // ============================================================
          const phase2Promises = [
            safeFetch<AttendanceRecord[]>(`/api/attendance?${params}`, []),
            safeFetch<Leave[]>(`/api/leaves?${params}`, []),
            safeFetch<Task[]>(`/api/tasks?${params}`, []),
            safeFetch<Request[]>(`/api/requests?${params}`, []),
            safeFetch<Complaint[]>(`/api/complaints?${params}`, []),
            safeFetch<Notification[]>(`/api/notifications?userId=${userId}`, []),
            safeFetch<PayrollRecord[]>(isAdmin ? '/api/payroll' : `/api/payroll?userId=${userId}`, []),
          ];
          const [rawAttendance, rawLeaves, rawTasks, rawRequests, rawComplaints, rawNotifications, rawPayroll] = await Promise.all(phase2Promises);

          const normAttendance = normalizeAttendance(rawAttendance);
          const normLeaves = normalizeLeaves(rawLeaves);
          const normTasks = normalizeTasks(rawTasks);
          const normRequests = normalizeRequests(rawRequests);
          const normComplaints = normalizeComplaints(rawComplaints);
          const normNotifications = normalizeNotifications(rawNotifications);
          const normPayroll = normalizePayroll(rawPayroll, rawUsers);

          // Update store with user-specific data
          set({
            attendance: normAttendance,
            leaves: normLeaves,
            tasks: normTasks,
            requests: normRequests,
            complaints: normComplaints,
            notifications: normNotifications,
            payroll: normPayroll,
          });

          // Calculate leave balance from loaded leaves data
          const sickUsed = normLeaves.filter(l => l.type === 'sick' && l.status === 'approved').length;
          const casualUsed = normLeaves.filter(l => l.type === 'casual' && l.status === 'approved').length;
          const vacationUsed = normLeaves.filter(l => l.type === 'vacation' && l.status === 'approved').length;
          const lbBase: LeaveBalance = {
            sick: { total: 10, used: sickUsed, remaining: 10 - sickUsed },
            casual: { total: 12, used: casualUsed, remaining: 12 - casualUsed },
            vacation: { total: 15, used: vacationUsed, remaining: 15 - vacationUsed },
          };
          set({ leaveBalance: lbBase });

          // ============================================================
          // Phase 3: Heavy/optional data — LAZY background loading
          // These are non-critical and load after the UI is interactive.
          // No artificial delays — fire in parallel.
          // ============================================================
          // Use setTimeout to yield to the browser for rendering first
          setTimeout(async () => {
            try {
              const phase3Promises = [
                safeFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`, []),
                safeFetch<AnalyticsData | null>(`/api/analytics?departmentId=${get().user?.departmentId || ''}`, null),
                safeFetch<any[]>(`/api/leave-balances?userId=${userId}`, []),
              ];
              const [rawAttendanceLogs, rawAnalytics, rawLeaveBalances] = await Promise.all(phase3Promises);

              const normAttendanceLogs = normalizeAttendanceLogs(rawAttendanceLogs);
              set({
                attendanceLogs: normAttendanceLogs,
                analytics: rawAnalytics,
              });

              // Update leave balance with API data if available
              if (rawLeaveBalances && rawLeaveBalances.length > 0) {
                const updatedLb = { ...lbBase };
                for (const lb of rawLeaveBalances) {
                  const type = normalizeStr(lb.leaveType);
                  updatedLb[type] = { total: lb.total, used: lb.used, remaining: lb.total - lb.used };
                }
                set({ leaveBalance: updatedLb });
              }

              // Load settings (non-critical)
              try {
                const settings = await apiFetch<SystemSettings>('/api/settings');
                if (settings) set({ settings });
              } catch { /* use defaults */ }
            } catch (phase3Error) {
              console.warn('Phase 3 data load failed (non-critical):', phase3Error);
            }
          }, 0);

          // Load teams (non-blocking — teams load lazily when needed)
          get().loadTeams().catch(() => {});
        } catch (error) {
          console.error('Failed to load data:', error);
          // Ensure isLoading is reset even on unexpected errors
          set({ isLoading: false });
        }
      },

      loadRequests: async () => {
        try {
          const user = get().user;
          if (!user) return;
          const data = await apiFetch<any[]>(`/api/requests?userId=${user.id}&role=${user.role}`);
          const normalized = normalizeRequestsData(data);
          set({ requests: normalized });
        } catch (error) {
          console.error('Failed to load requests:', error);
        }
      },

      loadTeams: async () => {
        try {
          const data = await apiFetch<any[]>('/api/teams');
          const teams: Team[] = (data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || undefined,
            color: t.color || '#6b7280',
            icon: t.icon || undefined,
            departmentId: t.departmentId || undefined,
            departmentName: t.departmentName || t.department?.name || undefined,
            createdBy: t.createdBy || '',
            isActive: t.isActive ?? true,
            members: (t.members || []).map((m: any) => ({
              id: m.id,
              teamId: m.teamId,
              userId: m.userId,
              role: (m.role?.toUpperCase() === 'LEAD' ? 'LEAD' : 'MEMBER') as TeamMemberRecord['role'],
              userName: m.user?.name || undefined,
              userEmail: m.user?.email || undefined,
              userRole: m.user?.role?.toLowerCase() || undefined,
            })),
            memberCount: t.memberCount ?? t.members?.length ?? undefined,
            taskCount: t.taskCount ?? t._count?.tasks ?? undefined,
            createdAt: t.createdAt,
          }));
          set({ teams });
        } catch (error) {
          console.error('Failed to load teams:', error);
        }
      },

      createTeam: async (name: string, description: string, members: Array<{userId: string; role: string}>, opts?: { departmentId?: string; color?: string }) => {
        try {
          await apiFetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, members, departmentId: opts?.departmentId, color: opts?.color }),
          });
          await get().loadTeams();
        } catch (error) {
          console.error('Create team failed:', error);
          throw error;
        }
      },

      updateTeam: async (id: string, updates: {name?: string; description?: string; color?: string; departmentId?: string | null; addMembers?: Array<{userId: string; role: string}>; removeMembers?: string[]}) => {
        try {
          await apiFetch('/api/teams', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          await get().loadTeams();
        } catch (error) {
          console.error('Update team failed:', error);
          throw error;
        }
      },

      deleteTeam: async (id: string) => {
        try {
          await apiFetch(`/api/teams?id=${id}`, { method: 'DELETE' });
          await get().loadTeams();
        } catch (error) {
          console.error('Delete team failed:', error);
          throw error;
        }
      },

      loadAdminTMSData: async () => {
        set({ adminTMSLoading: true });
        try {
          const data = await apiFetch<AdminTMSData>('/api/tasks-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dashboard' }),
          });
          set({ adminTMSData: data });
        } catch (error) {
          console.error('Failed to load admin TMS data:', error);
        } finally {
          set({ adminTMSLoading: false });
        }
      },

      createEpic: async (title: string, description: string, subTasks: Array<{title: string; assigneeId?: string; priority: string; dueDate?: string}>) => {
        try {
          await apiFetch('/api/tasks-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create-epic', title, description, subTasks }),
          });
          await get().loadAdminTMSData();
        } catch (error) {
          console.error('Create epic failed:', error);
          throw error;
        }
      },

      applyTemplate: async (templateId: string, userId: string) => {
        try {
          await apiFetch('/api/tasks-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'apply-template', templateId, userId }),
          });
          await get().loadAdminTMSData();
        } catch (error) {
          console.error('Apply template failed:', error);
          throw error;
        }
      },

      reviewTask: async (taskId: string, action: 'approve' | 'request-changes', comment?: string) => {
        try {
          await apiFetch('/api/tasks-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'review-task', taskId, reviewAction: action, comment }),
          });
          await get().loadAdminTMSData();
        } catch (error) {
          console.error('Review task failed:', error);
          throw error;
        }
      },

      loadTaskComments: async (taskId: string) => {
        try {
          const data = await apiFetch<TaskComment[]>(`/api/task-comments?taskId=${taskId}`);
          set({ taskComments: data || [] });
        } catch (error) {
          console.error('Failed to load task comments:', error);
        }
      },

      addTaskComment: async (taskId: string, comment: string) => {
        try {
          await apiFetch('/api/task-comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, comment }),
          });
          await get().loadTaskComments(taskId);
        } catch (error) {
          console.error('Add task comment failed:', error);
          throw error;
        }
      },

      loadTaskTemplates: async () => {
        try {
          const data = await apiFetch<TaskTemplate[]>('/api/task-templates');
          set({ taskTemplates: data || [] });
        } catch (error) {
          console.error('Failed to load task templates:', error);
        }
      },

      createTaskTemplate: async (template: {name: string; description?: string; category: string; taskItems: string}) => {
        try {
          await apiFetch('/api/task-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template),
          });
          await get().loadTaskTemplates();
        } catch (error) {
          console.error('Create task template failed:', error);
          throw error;
        }
      },

      // Admin leave management state
      adminLeaveData: null,
      adminLeaveLoading: false,
      managerLeaveData: null,
      managerLeaveLoading: false,
      managerTaskData: null,
      managerTaskLoading: false,
      loadAdminLeaveData: async () => {
        set({ adminLeaveLoading: true });
        try {
          const data = await apiFetch<AdminLeaveData>('/api/leave-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dashboard' }),
          });
          set({ adminLeaveData: data });
        } catch (error) {
          console.error('Failed to load admin leave data:', error);
        } finally {
          set({ adminLeaveLoading: false });
        }
      },

      toggleLeaveLockdown: async () => {
        try {
          await apiFetch('/api/leave-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle-lockdown' }),
          });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Toggle lockdown failed:', error);
          throw error;
        }
      },
      overrideLeaveBalance: async (userId: string, leaveType: string, delta: number, reason?: string) => {
        try {
          await apiFetch('/api/leave-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'override-balance', userId, leaveType, delta, reason }),
          });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Override balance failed:', error);
          throw error;
        }
      },
      createLeavePolicy: async (policy) => {
        try {
          await apiFetch('/api/leave-policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(policy),
          });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Create policy failed:', error);
          throw error;
        }
      },
      updateLeavePolicy: async (id, updates) => {
        try {
          await apiFetch('/api/leave-policies', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Update policy failed:', error);
          throw error;
        }
      },
      createCompanyHoliday: async (holiday) => {
        try {
          await apiFetch('/api/company-holidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(holiday),
          });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Create holiday failed:', error);
          throw error;
        }
      },
      deleteCompanyHoliday: async (id) => {
        try {
          await apiFetch(`/api/company-holidays?id=${id}`, { method: 'DELETE' });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Delete holiday failed:', error);
          throw error;
        }
      },
      yearEndRollover: async () => {
        try {
          await apiFetch('/api/leave-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'year-end-rollover' }),
          });
          await get().loadAdminLeaveData();
        } catch (error) {
          console.error('Year-end rollover failed:', error);
          throw error;
        }
      },

      // Manager leave management
      managerLeaveData: null,
      managerLeaveLoading: false,
      managerTaskData: null,
      managerTaskLoading: false,
      loadManagerLeaveData: async () => {
        set({ managerLeaveLoading: true });
        try {
          const data = await apiFetch<ManagerLeaveData>('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dashboard' }),
          });
          set({ managerLeaveData: data });
        } catch (error) {
          console.error('Failed to load manager leave data:', error);
        } finally {
          set({ managerLeaveLoading: false });
        }
      },
      bulkApproveLeaves: async (leaveIds, status, comment) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bulk-approve', leaveIds, status: status.toUpperCase(), comment }),
          });
          await get().loadManagerLeaveData();
          // Also refresh general leaves
          const user = get().user;
          if (user) {
            const params = new URLSearchParams();
            params.set('userId', user.id);
            const leaveRes = await apiFetch<any[]>(`/api/leaves?${params.toString()}`);
            const normalizeStr = (s: string) => (s || '').toLowerCase().trim();
            const normalized = (leaveRes || []).map((l: any) => ({
              ...l, status: normalizeStr(l.status) as Leave['status'], type: normalizeStr(l.type) as Leave['type'],
            }));
            set({ leaves: normalized });
          }
        } catch (error) {
          console.error('Bulk approve failed:', error);
          throw error;
        }
      },

      approveLeaveSingle: async (id, status, comment) => {
        try {
          const action = status === 'approved' ? 'approve' : 'reject';
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, leaveId: id, comment }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Approve/reject leave failed:', error);
          throw error;
        }
      },

      cancelTeamLeave: async (id, reason) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel-leave', leaveId: id, reason }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Cancel leave failed:', error);
          throw error;
        }
      },

      modifyTeamLeave: async (id, changes, reason) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'modify-leave', leaveId: id, ...changes, managerReason: reason }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Modify leave failed:', error);
          throw error;
        }
      },

      delegateLeaveApproval: async (id, delegateToManagerId, comment) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delegate', leaveId: id, delegateToManagerId, comment }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Delegate leave approval failed:', error);
          throw error;
        }
      },

      requestLeaveDocument: async (id, message) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'request-document', leaveId: id, message }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Request document failed:', error);
          throw error;
        }
      },

      markReturnToWork: async (id, notes) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'return-to-work', leaveId: id, notes }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Mark return-to-work failed:', error);
          throw error;
        }
      },

      carryForwardLeave: async (userId, leaveType, days, comment) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'carry-forward', userId, leaveType: leaveType.toUpperCase(), days, comment }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Carry forward failed:', error);
          throw error;
        }
      },

      encashLeave: async (userId, leaveType, days, comment) => {
        try {
          await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'encash', userId, leaveType: leaveType.toUpperCase(), days, comment }),
          });
          await get().loadManagerLeaveData();
        } catch (error) {
          console.error('Encash leave failed:', error);
          throw error;
        }
      },

      getTeamAvailability: async (startDate, endDate) => {
        try {
          const data = await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'team-availability', startDate, endDate }),
          });
          return data;
        } catch (error) {
          console.error('Get team availability failed:', error);
          throw error;
        }
      },

      getLeaveReport: async (startDate, endDate) => {
        try {
          const data = await apiFetch('/api/leave-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'leave-report', startDate, endDate }),
          });
          return data;
        } catch (error) {
          console.error('Get leave report failed:', error);
          throw error;
        }
      },

      // Manager task management
      loadManagerTaskData: async () => {
        set({ managerTaskLoading: true });
        try {
          const data = await apiFetch<ManagerTaskData>('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dashboard' }),
          });
          set({ managerTaskData: data });
        } catch (error) {
          console.error('Failed to load manager task data:', error);
        } finally {
          set({ managerTaskLoading: false });
        }
      },
      bulkUpdateTasks: async (taskIds, updates) => {
        try {
          await apiFetch('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bulk-update', taskIds, updates }),
          });
          await get().loadManagerTaskData();
        } catch (error) {
          console.error('Bulk update tasks failed:', error);
          throw error;
        }
      },
      bulkDeleteTasks: async (taskIds) => {
        try {
          await apiFetch('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bulk-delete', taskIds }),
          });
          await get().loadManagerTaskData();
        } catch (error) {
          console.error('Bulk delete tasks failed:', error);
          throw error;
        }
      },
      approveTask: async (taskId, score, comment) => {
        try {
          await apiFetch('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve-task', taskId, performanceScore: score, comment }),
          });
          await get().loadManagerTaskData();
        } catch (error) {
          console.error('Approve task failed:', error);
          throw error;
        }
      },
      requestTaskChanges: async (taskId, comment) => {
        try {
          await apiFetch('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'request-changes', taskId, comment }),
          });
          await get().loadManagerTaskData();
        } catch (error) {
          console.error('Request task changes failed:', error);
          throw error;
        }
      },
      reassignTask: async (taskId, assigneeId, reason) => {
        try {
          await apiFetch('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reassign', taskId, assigneeId, reason }),
          });
          await get().loadManagerTaskData();
        } catch (error) {
          console.error('Reassign task failed:', error);
          throw error;
        }
      },
      resolveTaskBlocker: async (taskId, comment) => {
        try {
          await apiFetch('/api/tasks-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resolve-blocker', taskId, comment }),
          });
          await get().loadManagerTaskData();
        } catch (error) {
          console.error('Resolve task blocker failed:', error);
          throw error;
        }
      },

      // Admin attendance state
      adminAttendanceData: null,
      adminAttendanceLoading: false,
      loadAdminAttendanceData: async (date?: string) => {
        set({ adminAttendanceLoading: true });
        try {
          const data = await apiFetch<AdminAttendanceData>('/api/attendance-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'anomalies', date }),
          });
          set({ adminAttendanceData: data });
        } catch (error) {
          console.error('Failed to load admin attendance data:', error);
        } finally {
          set({ adminAttendanceLoading: false });
        }
      },
      ghostClockOut: async (date: string, defaultTime: string) => {
        try {
          await apiFetch('/api/attendance-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ghost-clock-out', date, defaultTime }),
          });
          await get().loadAdminAttendanceData(date);
        } catch (error) {
          console.error('Ghost clock-out failed:', error);
          throw error;
        }
      },
      resolveMissedPunch: async (userId: string, punchType: string, time: string, date: string, note?: string) => {
        try {
          await apiFetch('/api/attendance-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resolve-missed-punch', userId, punchType, time, date, note }),
          });
          await get().loadAdminAttendanceData(date);
        } catch (error) {
          console.error('Resolve missed punch failed:', error);
          throw error;
        }
      },
      adminOverrideAttendance: async (attendanceId: string, updates: Record<string, unknown>) => {
        try {
          await apiFetch('/api/attendance-admin', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendanceId, ...updates }),
          });
          const date = get().adminAttendanceData?.date || new Date().toISOString().split('T')[0];
          await get().loadAdminAttendanceData(date);
        } catch (error) {
          console.error('Admin override failed:', error);
          throw error;
        }
      },
      manualAttendance: async (userId: string, status: string, clockIn?: string, clockOut?: string, note?: string, date?: string) => {
        try {
          await apiFetch('/api/attendance-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'manual-attendance', userId, status, clockIn, clockOut, note, date }),
          });
          const d = date || get().adminAttendanceData?.date || new Date().toISOString().split('T')[0];
          await get().loadAdminAttendanceData(d);
        } catch (error) {
          console.error('Manual attendance failed:', error);
          throw error;
        }
      },
      bulkManualAttendance: async (userIds: string[], status: string, clockIn?: string, clockOut?: string, note?: string, date?: string) => {
        try {
          await apiFetch('/api/attendance-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bulk-manual-attendance', userIds, status, clockIn, clockOut, note, date }),
          });
          const d = date || get().adminAttendanceData?.date || new Date().toISOString().split('T')[0];
          await get().loadAdminAttendanceData(d);
        } catch (error) {
          console.error('Bulk manual attendance failed:', error);
          throw error;
        }
      },

      // UI state
      isLoading: false,
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      clockInModalOpen: false,
      setClockInModalOpen: (open) => set({ clockInModalOpen: open }),
      notificationPanelOpen: false,
      setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
      commandPaletteOpen: false,
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      recentSearches: [],
      addRecentSearch: (search) => set((s) => {
        const trimmed = search.trim();
        if (!trimmed) return s;
        const filtered = s.recentSearches.filter((rs) => rs !== trimmed);
        return { recentSearches: [trimmed, ...filtered].slice(0, 8) };
      }),
      keyboardShortcutsOpen: false,
      toggleKeyboardShortcuts: () => set((s) => ({ keyboardShortcutsOpen: !s.keyboardShortcutsOpen })),
      setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),

      // Optimistic update tracking
      pendingActions: {},
      setPendingAction: (key, pending) => set((s) => ({
        pendingActions: { ...s.pendingActions, [key]: pending },
      })),

      // HRM detail selection state
      selectedJobId: null,
      selectedCandidateId: null,
      selectedOnboardingId: null,
      selectedTrainingId: null,
      setSelectedJobId: (id) => set({ selectedJobId: id }),
      setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),
      setSelectedOnboardingId: (id) => set({ selectedOnboardingId: id }),
      setSelectedTrainingId: (id) => set({ selectedTrainingId: id }),

      // Employee detail selection state
      selectedTaskId: null,
      selectedComplaintId: null,
      selectedRequestId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),
      setSelectedRequestId: (id) => set({ selectedRequestId: id }),
      setSelectedLeaveId: (id) => set({ selectedLeaveId: id }),

      // Actions
      clockIn: async (method, gpsData?) => {
        const user = get().user;
        if (!user) return;
        // Optimistic: add a present record for today immediately
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const tempId = `temp-clock-${Date.now()}`;
        const optimisticRecord: AttendanceRecord = {
          id: tempId,
          userId: user.id,
          userName: user.name,
          date: today,
          firstIn: now,
          lastOut: undefined,
          clockIn: now,
          clockOut: undefined,
          totalHours: undefined,
          status: 'present',
          method: method === 'face' ? 'face' : 'pin',
          gpsLatitude: gpsData?.latitude,
          gpsLongitude: gpsData?.longitude,
        };
        const prevAttendance = get().attendance;
        set((s) => ({
          attendance: [...s.attendance.filter((a) => a.date !== today || a.userId !== user.id), optimisticRecord],
          pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: true },
        }));
        try {
          await apiFetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              method,
              ...(gpsData ? { gpsLatitude: gpsData.latitude, gpsLongitude: gpsData.longitude, gpsAccuracy: gpsData.accuracy } : {}),
            }),
          });
          // Refresh attendance data from server to get accurate calculations
          const params = new URLSearchParams({ userId: user.id, role: user.role });
          const [attendance, attendanceLogs] = await Promise.all([
            apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
            apiFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`).catch(() => []),
          ]);
          set((s) => ({
            attendance: normalizeAttendance(attendance || []),
            attendanceLogs: normalizeAttendanceLogs(attendanceLogs || []),
            pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ attendance: prevAttendance, pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: false } }));
          console.error('Clock in failed:', error);
          throw error;
        }
      },

      clockInWithFace: async (imageBase64: string, gpsData?) => {
        const user = get().user;
        if (!user) return;
        // Optimistic: add a present record for today immediately
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const tempId = `temp-clock-${Date.now()}`;
        const optimisticRecord: AttendanceRecord = {
          id: tempId,
          userId: user.id,
          userName: user.name,
          date: today,
          firstIn: now,
          lastOut: undefined,
          clockIn: now,
          clockOut: undefined,
          totalHours: undefined,
          status: 'present',
          method: 'face',
          gpsLatitude: gpsData?.latitude,
          gpsLongitude: gpsData?.longitude,
        };
        const prevAttendance = get().attendance;
        const prevAttendanceLogs = get().attendanceLogs;
        set((s) => ({
          attendance: [...s.attendance.filter((a) => a.date !== today || a.userId !== user.id), optimisticRecord],
          pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: true },
        }));
        try {
          // Send to face recognition endpoint (creates attendance log + daily attendance internally)
          await apiFetch('/api/face-recognition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: imageBase64,
              userId: user.id,
              ...(gpsData ? { gpsLatitude: gpsData.latitude, gpsLongitude: gpsData.longitude, gpsAccuracy: gpsData.accuracy } : {}),
            }),
          });
          // Refresh data from server for accurate calculations
          const params = new URLSearchParams({ userId: user.id, role: user.role });
          const [attendance, attendanceLogs] = await Promise.all([
            apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
            apiFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`).catch(() => []),
          ]);
          set((s) => ({
            attendance: normalizeAttendance(attendance || []),
            attendanceLogs: normalizeAttendanceLogs(attendanceLogs || []),
            pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({
            attendance: prevAttendance,
            attendanceLogs: prevAttendanceLogs,
            pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: false },
          }));
          console.error('Face clock in failed:', error);
          throw error;
        }
      },

      clockInWithPin: async (pin: string, gpsData?) => {
        const user = get().user;
        if (!user) return;
        // Optimistic: add a present record for today immediately
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const tempId = `temp-clock-${Date.now()}`;
        const optimisticRecord: AttendanceRecord = {
          id: tempId,
          userId: user.id,
          userName: user.name,
          date: today,
          firstIn: now,
          lastOut: undefined,
          clockIn: now,
          clockOut: undefined,
          totalHours: undefined,
          status: 'present',
          method: 'pin',
          gpsLatitude: gpsData?.latitude,
          gpsLongitude: gpsData?.longitude,
        };
        const prevAttendance = get().attendance;
        const prevAttendanceLogs = get().attendanceLogs;
        set((s) => ({
          attendance: [...s.attendance.filter((a) => a.date !== today || a.userId !== user.id), optimisticRecord],
          pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: true },
        }));
        try {
          // /api/attendance POST auto-determines CLOCK_IN/CLOCK_OUT and creates both log + daily record
          await apiFetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              method: 'pin',
              pin,
              ...(gpsData ? { gpsLatitude: gpsData.latitude, gpsLongitude: gpsData.longitude, gpsAccuracy: gpsData.accuracy } : {}),
            }),
          });
          // Refresh data from server for accurate calculations
          const params = new URLSearchParams({ userId: user.id, role: user.role });
          const [attendance, attendanceLogs] = await Promise.all([
            apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
            apiFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`).catch(() => []),
          ]);
          set((s) => ({
            attendance: normalizeAttendance(attendance || []),
            attendanceLogs: normalizeAttendanceLogs(attendanceLogs || []),
            pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({
            attendance: prevAttendance,
            attendanceLogs: prevAttendanceLogs,
            pendingActions: { ...s.pendingActions, [`clockin-${user.id}`]: false },
          }));
          console.error('PIN clock in failed:', error);
          throw error;
        }
      },

      startBreak: async (gpsData?) => {
        const user = get().user;
        if (!user) return;
        try {
          await apiFetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              method: 'web',
              punchType: 'BREAK_START',
              ...(gpsData ? { gpsLatitude: gpsData.latitude, gpsLongitude: gpsData.longitude, gpsAccuracy: gpsData.accuracy } : {}),
            }),
          });
          // Refresh data
          const params = new URLSearchParams({ userId: user.id, role: user.role });
          const [attendance, attendanceLogs] = await Promise.all([
            apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
            apiFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`).catch(() => []),
          ]);
          set({ attendance: normalizeAttendance(attendance || []), attendanceLogs: normalizeAttendanceLogs(attendanceLogs || []) });
        } catch (error) {
          console.error('Start break failed:', error);
          throw error;
        }
      },

      endBreak: async (gpsData?) => {
        const user = get().user;
        if (!user) return;
        try {
          await apiFetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              method: 'web',
              punchType: 'BREAK_END',
              ...(gpsData ? { gpsLatitude: gpsData.latitude, gpsLongitude: gpsData.longitude, gpsAccuracy: gpsData.accuracy } : {}),
            }),
          });
          // Refresh data
          const params = new URLSearchParams({ userId: user.id, role: user.role });
          const [attendance, attendanceLogs] = await Promise.all([
            apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
            apiFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`).catch(() => []),
          ]);
          set({ attendance: normalizeAttendance(attendance || []), attendanceLogs: normalizeAttendanceLogs(attendanceLogs || []) });
        } catch (error) {
          console.error('End break failed:', error);
          throw error;
        }
      },

      manualPunch: async (userId: string, punchType: string, time: string) => {
        const user = get().user;
        if (!user) return;
        try {
          await apiFetch('/api/attendance-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, punchType, method: 'manual', time, editedBy: user.id }),
          });
          await apiFetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, method: 'manual', time }),
          });
          const params = new URLSearchParams({ userId: user.id, role: user.role });
          const [attendance, attendanceLogs] = await Promise.all([
            apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
            apiFetch<AttendanceLog[]>(`/api/attendance-logs?${params}`).catch(() => []),
          ]);
          set({ attendance: attendance || [], attendanceLogs: attendanceLogs || [] });
        } catch (error) {
          console.error('Manual punch failed:', error);
          throw error;
        }
      },

      recalculateAttendance: async (date: string) => {
        try {
          await apiFetch('/api/attendance-calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date }),
          });
          const user = get().user;
          if (user) {
            const params = new URLSearchParams({ userId: user.id, role: user.role });
            const attendance = await apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`);
            set({ attendance: attendance || [] });
          }
        } catch (error) {
          console.error('Recalculate attendance failed:', error);
          throw error;
        }
      },

      applyLeave: async (leave) => {
        const tempId = `temp-${Date.now()}`;
        const user = get().user;
        // Optimistic: add leave with temp ID immediately
        const optimisticLeave: Leave = {
          id: tempId,
          userId: leave.userId || user?.id || '',
          userName: user?.name || '',
          type: leave.type,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        };
        const prev = get().leaves;
        set((s) => ({
          leaves: [...s.leaves, optimisticLeave],
          pendingActions: { ...s.pendingActions, [`leave-${tempId}`]: true },
        }));
        try {
          const newLeave = await apiFetch<Leave>('/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leave),
          });
          const normalized = normalizeLeaves([newLeave])[0];
          // Replace optimistic item with real data
          set((s) => ({
            leaves: s.leaves.map((l) => l.id === tempId ? normalized : l),
            pendingActions: { ...s.pendingActions, [`leave-${tempId}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ leaves: prev, pendingActions: { ...s.pendingActions, [`leave-${tempId}`]: false } }));
          console.error('Apply leave failed:', error);
          throw error;
        }
      },

      approveLeave: async (id, status, comment) => {
        const prev = get().leaves;
        const upperStatus = status.toUpperCase() as 'APPROVED' | 'REJECTED';
        // Optimistic: update leave status immediately
        set((s) => ({
          leaves: s.leaves.map((l) => l.id === id ? { ...l, status: upperStatus, managerComment: comment } : l),
          pendingActions: { ...s.pendingActions, [`leave-approve-${id}`]: true },
        }));
        try {
          const user = get().user;
          await apiFetch('/api/leaves', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: upperStatus, managerId: user?.id, managerComment: comment }),
          });
          set((s) => ({ pendingActions: { ...s.pendingActions, [`leave-approve-${id}`]: false } }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ leaves: prev, pendingActions: { ...s.pendingActions, [`leave-approve-${id}`]: false } }));
          console.error('Approve leave failed:', error);
          throw error;
        }
      },

      createTask: async (task) => {
        try {
          const newTask = await apiFetch<Task>('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
          });
          const normalized = { ...newTask, status: normalizeStr(newTask.status) as Task['status'], priority: normalizeStr(newTask.priority) as Task['priority'] };
          set((s) => ({ tasks: [...s.tasks, normalized] }));
        } catch (error) {
          console.error('Create task failed:', error);
          throw error;
        }
      },

      updateTask: async (id, updates) => {
        const prev = get().tasks;
        // Optimistic: apply updates immediately
        set((s) => ({
          tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
          pendingActions: { ...s.pendingActions, [`task-${id}`]: true },
        }));
        try {
          await apiFetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          set((s) => ({ pendingActions: { ...s.pendingActions, [`task-${id}`]: false } }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ tasks: prev, pendingActions: { ...s.pendingActions, [`task-${id}`]: false } }));
          console.error('Update task failed:', error);
          throw error;
        }
      },

      deleteTask: async (id) => {
        try {
          await apiFetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
          set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        } catch (error) {
          console.error('Delete task failed:', error);
          throw error;
        }
      },

      createRequest: async (request) => {
        const tempId = `temp-${Date.now()}`;
        const user = get().user;
        // Optimistic: add request with temp ID immediately
        const optimisticRequest: Request = {
          id: tempId,
          userId: request.userId || user?.id || '',
          userName: user?.name || '',
          userEmail: user?.email || '',
          userDepartment: '',
          type: request.type,
          title: request.title || request.type,
          description: request.description || '',
          status: 'pending' as const,
          priority: request.priority || 'medium' as const,
          amount: request.amount,
          departmentId: request.departmentId,
          createdAt: new Date().toISOString(),
        };
        const prev = get().requests;
        set((s) => ({
          requests: [...s.requests, optimisticRequest],
          pendingActions: { ...s.pendingActions, [`request-${tempId}`]: true },
        }));
        try {
          const payload = {
            title: request.title,
            description: request.description,
            amount: request.amount,
          };
          const newRequest = await apiFetch<Request>('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...request,
              payload: JSON.stringify(payload),
            }),
          });
          const normalized = normalizeRequestsData([newRequest])[0];
          // Replace optimistic item with real data
          set((s) => ({
            requests: s.requests.map((r) => r.id === tempId ? normalized : r),
            pendingActions: { ...s.pendingActions, [`request-${tempId}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ requests: prev, pendingActions: { ...s.pendingActions, [`request-${tempId}`]: false } }));
          console.error('Create request failed:', error);
          throw error;
        }
      },

      updateRequest: async (id, status, comment) => {
        const prev = get().requests;
        const user = get().user;
        // Optimistic: update request status immediately
        set((s) => ({
          requests: s.requests.map((r) => r.id === id ? { ...r, status, reviewedBy: user?.id, reviewerName: user?.name, reviewComment: comment } : r),
          pendingActions: { ...s.pendingActions, [`request-update-${id}`]: true },
        }));
        try {
          const updated = await apiFetch('/api/requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, reviewedBy: user?.id, reviewComment: comment }),
          });
          const normalized = normalizeRequestsData([updated.data || updated])[0];
          set((s) => ({
            requests: s.requests.map((r) => r.id === id ? { ...r, ...normalized } : r),
            pendingActions: { ...s.pendingActions, [`request-update-${id}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ requests: prev, pendingActions: { ...s.pendingActions, [`request-update-${id}`]: false } }));
          console.error('Update request failed:', error);
          throw error;
        }
      },

      createComplaint: async (complaint) => {
        const tempId = `temp-${Date.now()}`;
        const user = get().user;
        // Optimistic: add complaint with temp ID immediately
        const optimisticComplaint: Complaint = {
          id: tempId,
          userId: complaint.userId || user?.id || '',
          userName: complaint.isAnonymous ? 'Anonymous' : (user?.name || ''),
          userEmail: user?.email || '',
          userDepartment: '',
          subject: complaint.subject,
          description: complaint.description,
          category: complaint.category,
          priority: complaint.priority,
          status: 'open' as const,
          isAnonymous: complaint.isAnonymous,
          severity: complaint.severity || 'normal' as const,
          createdAt: new Date().toISOString(),
        };
        const prev = get().complaints;
        set((s) => ({
          complaints: [...s.complaints, optimisticComplaint],
          pendingActions: { ...s.pendingActions, [`complaint-${tempId}`]: true },
        }));
        try {
          const newComplaint = await apiFetch<Complaint>('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complaint),
          });
          const normalized = normalizeComplaints([newComplaint])[0];
          // Replace optimistic item with real data
          set((s) => ({
            complaints: s.complaints.map((c) => c.id === tempId ? normalized : c),
            pendingActions: { ...s.pendingActions, [`complaint-${tempId}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ complaints: prev, pendingActions: { ...s.pendingActions, [`complaint-${tempId}`]: false } }));
          console.error('Create complaint failed:', error);
          throw error;
        }
      },

      updateComplaint: async (id, updates) => {
        const prev = get().complaints;
        // Optimistic: apply updates immediately
        set((s) => ({
          complaints: s.complaints.map((c) => c.id === id ? { ...c, ...updates } : c),
          pendingActions: { ...s.pendingActions, [`complaint-update-${id}`]: true },
        }));
        try {
          const updated = await apiFetch('/api/complaints', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates, resolutionNotes: updates.resolution ? updates.resolution : undefined }),
          });
          const normalized = normalizeComplaints([updated.data || updated])[0];
          set((s) => ({
            complaints: s.complaints.map((c) => c.id === id ? { ...c, ...normalized } : c),
            pendingActions: { ...s.pendingActions, [`complaint-update-${id}`]: false },
          }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ complaints: prev, pendingActions: { ...s.pendingActions, [`complaint-update-${id}`]: false } }));
          console.error('Update complaint failed:', error);
          throw error;
        }
      },

      markNotificationRead: async (id) => {
        const prev = get().notifications;
        // Optimistic: mark as read immediately
        set((s) => ({
          notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
          pendingActions: { ...s.pendingActions, [`notification-${id}`]: true },
        }));
        try {
          await apiFetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          set((s) => ({ pendingActions: { ...s.pendingActions, [`notification-${id}`]: false } }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ notifications: prev, pendingActions: { ...s.pendingActions, [`notification-${id}`]: false } }));
          console.error('Mark notification failed:', error);
        }
      },

      markAllNotificationsRead: async () => {
        const prev = get().notifications;
        // Optimistic: mark all as read immediately
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
          pendingActions: { ...s.pendingActions, 'notification-all': true },
        }));
        try {
          const user = get().user;
          await apiFetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user?.id, markAll: true }),
          });
          set((s) => ({ pendingActions: { ...s.pendingActions, 'notification-all': false } }));
        } catch (error) {
          // Rollback on error
          set((s) => ({ notifications: prev, pendingActions: { ...s.pendingActions, 'notification-all': false } }));
          console.error('Mark all notifications failed:', error);
        }
      },

      executeNotificationAction: async (notificationId: string, action: 'approve' | 'reject' | 'acknowledge', comment?: string) => {
        const prev = get().notifications;
        // Optimistic: mark the notification as read and remove its actionData
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true, actionData: null } : n
          ),
          pendingActions: { ...s.pendingActions, [`notif-action-${notificationId}`]: true },
        }));
        try {
          const result = await apiFetch('/api/notification-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId, action, comment }),
          });

          // If a leave/request was approved/rejected, refresh relevant data
          const user = get().user;
          if (user) {
            // Reload leaves/requests in the background
            get().loadData(user.id, user.role).catch(() => {});
          }

          set((s) => ({ pendingActions: { ...s.pendingActions, [`notif-action-${notificationId}`]: false } }));
          return result;
        } catch (error) {
          // Rollback on error
          set((s) => ({ notifications: prev, pendingActions: { ...s.pendingActions, [`notif-action-${notificationId}`]: false } }));
          console.error('Execute notification action failed:', error);
          throw error;
        }
      },

      // Recent actions tracking
      recentActions: [],
      addRecentAction: (action) => {
        set((s) => {
          // Keep only last 10 actions, deduplicate by id
          const filtered = s.recentActions.filter(a => a.id !== action.id);
          return {
            recentActions: [{ ...action, timestamp: Date.now() }, ...filtered].slice(0, 10),
          };
        });
      },

      updateSettings: async (settings) => {
        try {
          await apiFetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
          });
          set((s) => ({ settings: { ...s.settings, ...settings } }));
        } catch (error) {
          console.error('Update settings failed:', error);
          throw error;
        }
      },

      createRule: async (rule) => {
        try {
          const newRule = await apiFetch<SystemRule>('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
          });
          set((s) => ({ rules: [...s.rules, newRule] }));
        } catch (error) {
          console.error('Create rule failed:', error);
          throw error;
        }
      },

      updateRule: async (id, updates) => {
        try {
          await apiFetch('/api/rules', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          set((s) => ({
            rules: s.rules.map((r) => r.id === id ? { ...r, ...updates } : r),
          }));
        } catch (error) {
          console.error('Update rule failed:', error);
          throw error;
        }
      },

      deleteRule: async (id) => {
        try {
          await apiFetch(`/api/rules?id=${id}`, { method: 'DELETE' });
          set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        } catch (error) {
          console.error('Delete rule failed:', error);
          throw error;
        }
      },

      generatePayroll: async (month, departmentId) => {
        try {
          const newPayroll = await apiFetch<PayrollRecord[]>('/api/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, departmentId }),
          });
          const normalized = (newPayroll || []).map((p: any) => ({
            id: p.id,
            userId: p.userId,
            userName: p.user?.name || p.userName || '',
            userEmail: p.user?.email || '',
            userDepartment: p.user?.department?.name || '',
            userPosition: p.user?.position || '',
            month: p.month,
            baseSalary: p.baseSalary,
            overtime: p.overtime ?? 0,
            allowances: p.allowances ?? 0,
            bonus: p.bonus ?? 0,
            tax: p.tax ?? 0,
            insurance: p.insurance ?? 0,
            providentFund: p.providentFund ?? 0,
            otherDeductions: p.otherDeductions ?? 0,
            deductions: p.deductions ?? 0,
            grossSalary: p.grossSalary || (p.baseSalary + (p.overtime ?? 0) + (p.allowances ?? 0) + (p.bonus ?? 0)),
            netSalary: p.netSalary || ((p.grossSalary || (p.baseSalary + (p.overtime ?? 0) + (p.allowances ?? 0) + (p.bonus ?? 0))) - (p.deductions ?? 0)),
            status: normalizeStr(p.status) as PayrollRecord['status'],
            paymentMethod: normalizeStr(p.paymentMethod || 'BANK_TRANSFER') as PayrollRecord['paymentMethod'],
            bankName: p.bankName || undefined,
            bankAccount: p.bankAccount || undefined,
            notes: p.notes || undefined,
            reviewedBy: p.reviewedById || undefined,
            reviewerName: p.reviewer?.name || undefined,
            reviewedAt: p.reviewedAt || undefined,
            approvedBy: p.approvedById || undefined,
            approverName: p.approver?.name || undefined,
            approvedAt: p.approvedAt || undefined,
            generatedAt: p.generatedAt,
            paidAt: p.paidAt || undefined,
            createdAt: p.createdAt || undefined,
            updatedAt: p.updatedAt || undefined,
          }));
          set((s) => ({ payroll: [...s.payroll, ...normalized] }));
        } catch (error) {
          console.error('Generate payroll failed:', error);
          throw error;
        }
      },

      updatePayroll: async (id, updates) => {
        try {
          await apiFetch('/api/payroll', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          set((s) => ({
            payroll: s.payroll.map((p) => p.id === id ? { ...p, ...updates } : p),
          }));
        } catch (error) {
          console.error('Update payroll failed:', error);
          throw error;
        }
      },

      bulkPayrollAction: async (ids, action) => {
        try {
          await apiFetch('/api/payroll', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, action }),
          });
          // Refresh payroll data
          const user = get().user;
          if (user) {
            const payrollUrl = user.role === 'admin' ? '/api/payroll' : `/api/payroll?userId=${user.id}`;
            const data = await apiFetch<PayrollRecord[]>(payrollUrl);
            const normUsers = get().users;
            const normalized = (data || []).map((p: any) => ({
              id: p.id, userId: p.userId,
              userName: p.user?.name || normUsers.find(u => u.id === p.userId)?.name || '',
              userEmail: p.user?.email || '', userDepartment: p.user?.department?.name || '',
              month: p.month, baseSalary: p.baseSalary,
              overtime: p.overtime ?? 0, allowances: p.allowances ?? 0,
              bonus: p.bonus ?? 0, tax: p.tax ?? 0, insurance: p.insurance ?? 0,
              providentFund: p.providentFund ?? 0, otherDeductions: p.otherDeductions ?? 0,
              deductions: p.deductions ?? 0, grossSalary: p.grossSalary || (p.baseSalary + (p.overtime ?? 0) + (p.allowances ?? 0) + (p.bonus ?? 0)), netSalary: p.netSalary || ((p.grossSalary || (p.baseSalary + (p.overtime ?? 0) + (p.allowances ?? 0) + (p.bonus ?? 0))) - (p.deductions ?? 0)),
              status: normalizeStr(p.status) as PayrollRecord['status'],
              paymentMethod: normalizeStr(p.paymentMethod || 'BANK_TRANSFER') as PayrollRecord['paymentMethod'],
              generatedAt: p.generatedAt, paidAt: p.paidAt || undefined,
            }));
            set({ payroll: normalized });
          }
        } catch (error) {
          console.error('Bulk payroll action failed:', error);
          throw error;
        }
      },

      loadPayrollDashboard: async () => {
        set({ payrollLoading: true });
        try {
          const data = await apiFetch<PayrollDashboardData>('/api/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dashboard' }),
          });
          set({ payrollDashboard: data });
        } catch (error) {
          console.error('Failed to load payroll dashboard:', error);
        } finally {
          set({ payrollLoading: false });
        }
      },

      loadSalaryStructures: async () => {
        try {
          const data = await apiFetch<SalaryStructure[]>('/api/payroll?action=structures');
          const normalized = (data || []).map((s: any) => ({
            id: s.id, userId: s.userId,
            userName: s.user?.name || '', userEmail: s.user?.email || '',
            userDepartment: s.user?.department?.name || '',
            baseSalary: s.baseSalary, housingAllowance: s.housingAllowance ?? 0,
            transportAllowance: s.transportAllowance ?? 0, medicalAllowance: s.medicalAllowance ?? 0,
            foodAllowance: s.foodAllowance ?? 0, otherAllowances: s.otherAllowances ?? 0,
            overtimeRate: s.overtimeRate ?? 0, taxPercentage: s.taxPercentage ?? 0,
            insuranceRate: s.insuranceRate ?? 0, providentFundRate: s.providentFundRate ?? 0,
            effectiveFrom: s.effectiveFrom, effectiveTo: s.effectiveTo || undefined,
            bankName: s.bankName || undefined, bankAccount: s.bankAccount || undefined,
            paymentMethod: normalizeStr(s.paymentMethod || 'BANK_TRANSFER') as SalaryStructure['paymentMethod'],
            isActive: s.isActive ?? true, createdAt: s.createdAt, updatedAt: s.updatedAt || undefined,
          }));
          set({ salaryStructures: normalized });
        } catch (error) {
          console.error('Failed to load salary structures:', error);
        }
      },

      createSalaryStructure: async (structure) => {
        try {
          await apiFetch('/api/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create-structure', ...structure }),
          });
          await get().loadSalaryStructures();
        } catch (error) {
          console.error('Create salary structure failed:', error);
          throw error;
        }
      },

      updateSalaryStructure: async (id, updates) => {
        try {
          await apiFetch('/api/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update-structure', id, ...updates }),
          });
          await get().loadSalaryStructures();
        } catch (error) {
          console.error('Update salary structure failed:', error);
          throw error;
        }
      },

      editPayrollRecord: async (id, updates) => {
        try {
          await apiFetch('/api/payroll', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'edit', ...updates }),
          });
          set((s) => ({
            payroll: s.payroll.map((p) => p.id === id ? { ...p, ...updates } : p),
          }));
        } catch (error) {
          console.error('Edit payroll record failed:', error);
          throw error;
        }
      },

      // ─── Department Management ───────────────────────────────
      createDepartment: async (data) => {
        try {
          const result = await apiFetch<any>('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const newDept: Department = {
            id: result.id,
            name: result.name,
            description: result.description || undefined,
            color: result.color || undefined,
            icon: result.icon || undefined,
            location: result.location || undefined,
            budget: result.budget || undefined,
            managerId: result.managerId || undefined,
            managerName: result.manager?.name || '',
            employeeCount: result._count?.users || 0,
            isActive: result.isActive ?? true,
            createdAt: result.createdAt || undefined,
            teamCount: result._count?.teams || 0,
          };
          set((s) => ({ departments: [...s.departments, newDept] }));
        } catch (error) {
          console.error('Create department failed:', error);
          throw error;
        }
      },

      updateDepartment: async (id, updates) => {
        try {
          const result = await apiFetch<any>('/api/departments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          set((s) => ({
            departments: s.departments.map((d) =>
              d.id === id ? {
                ...d,
                ...updates,
                managerName: result.manager?.name || d.managerName,
                employeeCount: result._count?.users ?? d.employeeCount,
                teamCount: result._count?.teams ?? d.teamCount,
              } : d
            ),
          }));
        } catch (error) {
          console.error('Update department failed:', error);
          throw error;
        }
      },

      deleteDepartment: async (id) => {
        try {
          await apiFetch(`/api/departments?id=${id}`, { method: 'DELETE' });
          set((s) => ({ departments: s.departments.filter((d) => d.id !== id) }));
        } catch (error) {
          console.error('Delete department failed:', error);
          throw error;
        }
      },

      loadDepartments: async () => {
        try {
          const data = await apiFetch<any[]>('/api/departments');
          const normalized = (data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description || undefined,
            color: d.color || undefined,
            icon: d.icon || undefined,
            location: d.location || undefined,
            budget: d.budget || undefined,
            managerId: d.managerId || undefined,
            managerName: d.manager?.name || '',
            employeeCount: d._count?.users || 0,
            isActive: d.isActive ?? true,
            createdAt: d.createdAt || undefined,
            teamCount: d._count?.teams || 0,
          }));
          set({ departments: normalized });
        } catch (error) {
          console.error('Load departments failed:', error);
        }
      },

      // ─── User management ──────────────────────────────────────
      createUser: async (data) => {
        try {
          await apiFetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          await get().loadUsers();
        } catch (error) {
          console.error('Create user failed:', error);
          throw error;
        }
      },
      updateUser: async (id, updates) => {
        try {
          await apiFetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          await get().loadUsers();
        } catch (error) {
          console.error('Update user failed:', error);
          throw error;
        }
      },
      deactivateUser: async (id) => {
        try {
          await apiFetch(`/api/users?id=${id}`, { method: 'DELETE' });
          await get().loadUsers();
        } catch (error) {
          console.error('Deactivate user failed:', error);
          throw error;
        }
      },

      // ─── Shift management ──────────────────────────────────────
      loadShifts: async () => {
        try {
          const data = await apiFetch<any[]>('/api/shifts');
          const shifts: Shift[] = (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            gracePeriod: s.gracePeriod ?? 15,
            halfDayMin: s.halfDayMin ?? 4.5,
            overtimeThreshold: s.overtimeThreshold ?? 9,
            isDefault: s.isDefault ?? false,
            color: s.color || '#10b981',
            employeeCount: s.employeeCount ?? s._count?.users ?? 0,
          }));
          set({ shifts });
        } catch (error) {
          console.error('Load shifts failed:', error);
        }
      },

      createShift: async (data) => {
        try {
          await apiFetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          await get().loadShifts();
        } catch (error) {
          console.error('Create shift failed:', error);
          throw error;
        }
      },

      updateShift: async (id, updates) => {
        try {
          await apiFetch('/api/shifts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          await get().loadShifts();
          await get().loadUsers();
        } catch (error) {
          console.error('Update shift failed:', error);
          throw error;
        }
      },

      deleteShift: async (id) => {
        try {
          await apiFetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
          await get().loadShifts();
          await get().loadUsers();
        } catch (error) {
          console.error('Delete shift failed:', error);
          throw error;
        }
      },

      assignEmployeeToShift: async (userId, shiftId) => {
        try {
          await apiFetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, shiftId }),
          });
          await get().loadUsers();
          await get().loadShifts();
        } catch (error) {
          console.error('Assign employee to shift failed:', error);
          throw error;
        }
      },

      bulkAssignShift: async (userIds, shiftId) => {
        try {
          await Promise.all(
            userIds.map(userId =>
              apiFetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, shiftId }),
              })
            )
          );
          await get().loadUsers();
          await get().loadShifts();
        } catch (error) {
          console.error('Bulk assign shift failed:', error);
          throw error;
        }
      },

      loadUsers: async () => {
        try {
          const data = await apiFetch<any[]>('/api/users');
          const normalized: User[] = (data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: normalizeStr(u.role) as User['role'],
            departmentId: u.departmentId || '',
            department: u.department?.name || '',
            avatar: u.avatarUrl || '',
            phone: u.phone || undefined,
            position: u.position || undefined,
            joinDate: u.joinDate || u.createdAt || undefined,
            salary: u.salary || undefined,
            isActive: u.isActive ?? true,
            workMode: normalizeStr(u.workMode || 'OFFICE'),
            shiftId: u.shiftId || undefined,
            shiftName: u.shift?.name || undefined,
          }));
          set({ users: normalized });
        } catch (error) {
          console.error('Load users failed:', error);
        }
      },
    }),
    {
      name: 'ems-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        authToken: state.authToken,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// NEW ARCHITECTURE RE-EXPORTS (v2.0)
// The old Zustand store above is DEPRECATED for server state.
// New code should use:
//   - useUIStore from '@/lib/ui-store' for UI state only
//   - TanStack Query hooks from '@/lib/query-hooks' for server state
//   - apiClient/api from '@/lib/api-client' for HTTP requests
//   - withMiddleware from '@/lib/middleware' for API routes
//
// The old store remains functional for backward compatibility.
// Components will gradually migrate to the new architecture.
// ═══════════════════════════════════════════════════════════════════════════════

export { useUIStore } from './ui-store';
export { apiClient, api, ApiError } from './api-client';
export { queryKeys, useDepartments, useUsers, useShifts, useAttendance, useAttendanceLogs, useLeaves, useLeaveBalances, useTasks, useTaskComments, useRequests, useComplaints, useNotifications, usePayroll, useTeams, useAnalytics, useSettings, useRules, useFiles, useClockIn, useClockOut, useApplyLeave, useCreateTask, useUpdateTask, useDeleteTask, useAddTaskComment, useCreateRequest, useCreateComplaint, useMarkNotificationRead, useMarkAllNotificationsRead, useExecuteNotificationAction, useUploadFile, useDeleteFile, useInvestments, useCreateTeam } from './query-hooks';
export { withMiddleware, schemas, adminOnly, managerUp, authOnly } from './middleware';
