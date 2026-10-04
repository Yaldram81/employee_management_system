/**
 * TanStack Query Hooks for Server State — Employee-Focused
 *
 * These hooks replace the server data that was previously in the Zustand store.
 * Benefits:
 *   - Auto-refetch on window focus / stale time
 *   - Cache invalidation after mutations
 *   - Stale-while-revalidate pattern
 *   - Loading/error states built-in
 *   - Deduplication of concurrent requests
 *
 * Usage:
 *   const { data: tasks, isLoading } = useEmployeeTasks();
 *   const createTask = useCreateTask();
 *   createTask.mutate(newTask);
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api, ApiError } from './api-client';
import { useUIStore } from './ui-store';
import type {
  Department, User, AttendanceRecord, AttendanceLog, Shift, Leave,
  Task, Request, Complaint, Notification, NotificationActionData,
  SystemRule, SystemSettings, PayrollRecord, SalaryStructure,
  PayrollDashboardData, AnalyticsData, LeaveBalance,
  Team, TeamMemberRecord, TaskComment, TaskTemplate,
  LeavePolicy, CompanyHoliday, InvestmentDeclaration, TaxSimulationResult,
} from './types';

// ─── Normalizers ────────────────────────────────────────────────────────────
// These convert raw API responses into the frontend type format.

function normalizeStr(val: unknown): string {
  if (typeof val === 'string') return val.toLowerCase().replace(/_/g, '-');
  return '';
}

function normalizeDepartments(data: any[]): Department[] {
  return (data || []).map((d) => ({
    id: d.id, name: d.name, description: d.description || undefined,
    color: d.color || undefined, icon: d.icon || undefined, location: d.location || undefined,
    budget: d.budget || undefined, managerId: d.managerId || undefined,
    managerName: d.manager?.name || '', employeeCount: d._count?.users || d.users?.length || 0,
    isActive: d.isActive ?? true, createdAt: d.createdAt || undefined,
    teamCount: d._count?.teams || 0,
  }));
}

function normalizeUsers(data: any[]): User[] {
  return (data || []).map((u) => ({
    id: u.id, name: u.name, email: u.email,
    role: normalizeStr(u.role) as User['role'],
    departmentId: u.departmentId || '', department: u.department?.name || '',
    avatar: u.avatarUrl || '', phone: u.phone || undefined,
    position: u.position || undefined, joinDate: u.joinDate || u.createdAt || undefined,
    salary: u.salary || undefined, isActive: u.isActive ?? true,
    workMode: normalizeStr(u.workMode || 'OFFICE'),
    shiftId: u.shiftId || undefined, shiftName: u.shift?.name || undefined,
  }));
}

function normalizeAttendance(data: any[]): AttendanceRecord[] {
  return (data || []).map((a) => ({
    id: a.id, userId: a.userId, userName: a.user?.name || '',
    date: a.date, firstIn: a.firstIn || a.clockIn || undefined,
    lastOut: a.lastOut || a.clockOut || undefined,
    clockIn: a.clockIn || a.firstIn || undefined,
    clockOut: a.clockOut || a.lastOut || undefined,
    totalHours: a.totalHours ?? undefined, breakMinutes: a.breakMinutes ?? undefined,
    breakHours: a.breakHours ?? (a.breakMinutes ? a.breakMinutes / 60 : undefined),
    netWorkHours: a.netWorkHours ?? ((a.totalHours != null && a.breakMinutes) ? Math.max(0, a.totalHours - a.breakMinutes / 60) : undefined),
    status: normalizeStr(a.status) as AttendanceRecord['status'],
    method: normalizeStr(a.method) as AttendanceRecord['method'],
    overtimeHours: a.overtimeHours ?? undefined, workMode: a.workMode || undefined,
    gpsLatitude: a.gpsLatitude ?? undefined, gpsLongitude: a.gpsLongitude ?? undefined,
    locationName: a.locationName || undefined, isGeofenceOk: a.isGeofenceOk ?? undefined,
    isEdited: a.isEdited ?? undefined, editedBy: a.editedBy || undefined, note: a.note || undefined,
  }));
}

function normalizeAttendanceLogs(data: any[]): AttendanceLog[] {
  return (data || []).map((l) => ({
    id: l.id, userId: l.userId, userName: l.user?.name || '',
    punchType: normalizeStr(l.punchType) as AttendanceLog['punchType'],
    punchTime: l.punchTime, method: normalizeStr(l.method) as AttendanceLog['method'],
    confidence: l.confidence ?? undefined, ipAddress: l.ipAddress || undefined,
    gpsLatitude: l.gpsLatitude ?? undefined, gpsLongitude: l.gpsLongitude ?? undefined,
    gpsAccuracy: l.gpsAccuracy ?? undefined, locationName: l.locationName || undefined,
    deviceId: l.deviceId || undefined, isFlagged: l.isFlagged ?? false,
    flagReason: l.flagReason || undefined, isBreak: l.isBreak ?? false,
    editedBy: l.editedBy || undefined, createdAt: l.createdAt,
  }));
}

function normalizeLeaves(data: any[]): Leave[] {
  return (data || []).map((l) => ({
    id: l.id, userId: l.userId, userName: l.user?.name || '',
    type: normalizeStr(l.type) as Leave['type'],
    startDate: l.startDate, endDate: l.endDate, reason: l.reason,
    status: normalizeStr(l.status) as Leave['status'],
    managerId: l.managerId || undefined, managerComment: l.managerComment || undefined,
    createdAt: l.createdAt,
  }));
}

function normalizeTasks(data: any[]): Task[] {
  return (data || []).map((t) => ({
    id: t.id, title: t.title, description: t.description || undefined,
    status: normalizeStr(t.status) as Task['status'],
    priority: normalizeStr(t.priority) as Task['priority'],
    assigneeId: t.assigneeId || undefined, assigneeName: t.assignee?.name || undefined,
    reporterId: t.reporterId || undefined, reporterName: t.reporter?.name || undefined,
    departmentId: t.departmentId || undefined, teamId: t.teamId || undefined,
    teamName: t.team?.name || undefined, parentTaskId: t.parentTaskId || undefined,
    isBlocked: t.isBlocked ?? false, blockedReason: t.blockedReason || undefined,
    performanceScore: t.performanceScore || undefined, completedAt: t.completedAt || undefined,
    dueDate: t.dueDate || undefined, createdAt: t.createdAt,
    subTasks: t.subTasks ? normalizeTasks(t.subTasks) : undefined,
    commentCount: t._count?.comments ?? t.commentCount ?? 0,
    comments: t.comments || undefined,
  }));
}

function normalizeRequests(data: any[]): Request[] {
  return (data || []).map((r) => ({
    id: r.id, userId: r.userId,
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
    resolvedAt: r.resolvedAt || undefined, cancelledAt: r.cancelledAt || undefined,
    escalatedAt: r.escalatedAt || undefined, escalatedBy: r.escalatedBy || undefined,
    createdAt: r.createdAt, updatedAt: r.updatedAt || undefined,
  }));
}

function normalizeComplaints(data: any[]): Complaint[] {
  return (data || []).map((c) => ({
    id: c.id, userId: c.userId || '',
    userName: c.user?.name || (c.isAnonymous ? 'Anonymous' : ''),
    userEmail: c.user?.email || '', userDepartment: c.user?.department?.name || '',
    subject: c.subject, description: c.description,
    category: normalizeStr(c.category || 'GENERAL') as Complaint['category'],
    priority: normalizeStr(c.priority || 'MEDIUM') as Complaint['priority'],
    status: normalizeStr(c.status) as Complaint['status'],
    isAnonymous: c.isAnonymous, resolution: c.resolutionNotes || undefined,
    resolvedBy: c.resolvedById || undefined, resolverName: c.resolver?.name || undefined,
    resolvedAt: c.resolvedAt || undefined, departmentId: c.departmentId || undefined,
    departmentName: c.department?.name || c.user?.department?.name || undefined,
    assignedToId: c.assignedToId || undefined, assigneeName: c.assignee?.name || undefined,
    escalatedAt: c.escalatedAt || undefined, escalatedBy: c.escalatedById || undefined,
    escalatorName: c.escalator?.name || undefined, closedAt: c.closedAt || undefined,
    dueDate: c.dueDate || undefined,
    attachmentUrls: (() => { try { return c.attachmentUrls ? JSON.parse(c.attachmentUrls) : undefined; } catch { return undefined; } })(),
    severity: normalizeStr(c.severity || 'NORMAL') as Complaint['severity'],
    createdAt: c.createdAt, updatedAt: c.updatedAt || undefined,
  }));
}

function normalizeNotifications(data: any[]): Notification[] {
  return (data || []).map((n) => ({
    id: n.id, userId: n.userId, title: n.title, message: n.message,
    type: normalizeStr(n.type) as Notification['type'], isRead: n.isRead,
    link: n.actionUrl || undefined,
    actionData: (() => { try { return n.actionData ? JSON.parse(n.actionData) : undefined; } catch { return undefined; } })(),
    createdAt: n.createdAt,
  }));
}

function normalizeShifts(data: any[]): Shift[] {
  return (data || []).map((s) => ({
    id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime,
    gracePeriod: s.gracePeriod ?? 15, halfDayMin: s.halfDayMin ?? 4,
    overtimeThreshold: s.overtimeThreshold ?? 8, isDefault: s.isDefault ?? false,
    color: s.color || '#10b981', employeeCount: s.employeeCount ?? s._count?.users ?? 0,
  }));
}

function normalizeRules(data: any[]): SystemRule[] {
  return (data || []).map((r) => ({
    id: r.id, name: r.name,
    description: `${r.triggerEvent} → ${r.action}`,
    condition: `Occurs ${r.conditionCount} time(s)`,
    action: r.action, isActive: r.isActive, createdAt: r.createdAt,
  }));
}

function normalizePayroll(data: any[]): PayrollRecord[] {
  return (data || []).map((p) => ({
    id: p.id, userId: p.userId, userName: p.user?.name || '',
    userEmail: p.user?.email || '', userDepartment: p.user?.department?.name || '',
    userPosition: p.user?.position || '', month: p.month, baseSalary: p.baseSalary,
    overtime: p.overtime ?? 0, allowances: p.allowances ?? 0, bonus: p.bonus ?? 0,
    tax: p.tax ?? 0, insurance: p.insurance ?? 0, providentFund: p.providentFund ?? 0,
    otherDeductions: p.otherDeductions ?? 0, deductions: p.deductions ?? 0,
    grossSalary: p.grossSalary ?? (p.baseSalary + (p.overtime ?? 0) + (p.allowances ?? 0) + (p.bonus ?? 0)),
    netSalary: p.netSalary,
    status: (() => { const s = normalizeStr(p.status); if (s === 'draft') return 'draft'; if (s === 'on-hold') return 'on-hold'; return s; })() as PayrollRecord['status'],
    paymentMethod: normalizeStr(p.paymentMethod || 'BANK_TRANSFER') as PayrollRecord['paymentMethod'],
    bankName: p.bankName || undefined, bankAccount: p.bankAccount || undefined,
    notes: p.notes || undefined, reviewedBy: p.reviewedById || undefined,
    reviewerName: p.reviewer?.name || undefined, reviewedAt: p.reviewedAt || undefined,
    approvedBy: p.approvedById || undefined, approverName: p.approver?.name || undefined,
    approvedAt: p.approvedAt || undefined, generatedAt: p.generatedAt,
    paidAt: p.paidAt || undefined, createdAt: p.createdAt || undefined,
    updatedAt: p.updatedAt || undefined,
  }));
}

function normalizeTeams(data: any[]): Team[] {
  return (data || []).map((t) => ({
    id: t.id, name: t.name, description: t.description || undefined,
    color: t.color || '#6b7280', icon: t.icon || undefined,
    departmentId: t.departmentId || undefined,
    departmentName: t.departmentName || t.department?.name || undefined,
    createdBy: t.createdBy || '', isActive: t.isActive ?? true,
    members: (t.members || []).map((m: any) => ({
      id: m.id, teamId: m.teamId, userId: m.userId,
      role: (m.role?.toUpperCase() === 'LEAD' ? 'LEAD' : 'MEMBER') as TeamMemberRecord['role'],
      userName: m.user?.name || undefined, userEmail: m.user?.email || undefined,
      userRole: m.user?.role?.toLowerCase() || undefined,
    })),
    memberCount: t.memberCount ?? t.members?.length ?? undefined,
    taskCount: t.taskCount ?? t._count?.tasks ?? undefined,
    createdAt: t.createdAt,
  }));
}

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const queryKeys = {
  departments: ['departments'] as const,
  users: ['users'] as const,
  shifts: ['shifts'] as const,
  rules: ['rules'] as const,
  settings: ['settings'] as const,
  attendance: (userId: string, role: string) => ['attendance', userId, role] as const,
  attendanceLogs: (userId: string, role: string) => ['attendanceLogs', userId, role] as const,
  leaves: (userId: string, role: string) => ['leaves', userId, role] as const,
  leaveBalances: (userId: string) => ['leaveBalances', userId] as const,
  leavePolicies: ['leavePolicies'] as const,
  companyHolidays: ['companyHolidays'] as const,
  tasks: (userId: string, role: string) => ['tasks', userId, role] as const,
  taskComments: (taskId: string) => ['taskComments', taskId] as const,
  taskTemplates: ['taskTemplates'] as const,
  requests: (userId: string, role: string) => ['requests', userId, role] as const,
  complaints: (userId: string, role: string) => ['complaints', userId, role] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  payroll: (userId: string, role: string) => ['payroll', userId, role] as const,
  salaryStructures: ['salaryStructures'] as const,
  teams: ['teams'] as const,
  analytics: (departmentId: string) => ['analytics', departmentId] as const,
  investments: (userId: string) => ['investments', userId] as const,
  taxSimulation: (userId: string) => ['taxSimulation', userId] as const,
  files: (entityType: string, entityId: string) => ['files', entityType, entityId] as const,
};

// ─── Helper: get user from store ────────────────────────────────────────────

function useAuth() {
  const user = useUIStore((s) => s.user);
  const isAuthenticated = useUIStore((s) => s.isAuthenticated);
  return { user, isAuthenticated };
}

// ─── Department Queries ─────────────────────────────────────────────────────

export function useDepartments() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.departments,
    queryFn: async () => {
      const url = user?.role === 'employee' ? '/api/departments?scope=mine' : '/api/departments';
      const raw = await api.get<any[]>(url);
      return normalizeDepartments(raw);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ─── User Queries ───────────────────────────────────────────────────────────

export function useUsers() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      let url = '/api/users';
      if (user?.role === 'employee') url += `?scope=colleagues&userId=${user.id}`;
      else if (user?.role === 'manager') url += `?userId=${user.id}`;
      const raw = await api.get<any[]>(url);
      return normalizeUsers(raw);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Shift Queries ──────────────────────────────────────────────────────────

export function useShifts() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.shifts,
    queryFn: async () => {
      const raw = await api.get<any[]>('/api/shifts');
      return normalizeShifts(raw);
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Attendance Queries ─────────────────────────────────────────────────────

export function useAttendance() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.attendance(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id, role: user!.role });
      const raw = await api.get<any[]>(`/api/attendance?${params}`);
      return normalizeAttendance(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAttendanceLogs() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.attendanceLogs(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id, role: user!.role });
      const raw = await api.get<any[]>(`/api/attendance-logs?${params}`);
      return normalizeAttendanceLogs(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000,
  });
}

// ─── Leave Queries ──────────────────────────────────────────────────────────

export function useLeaves() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.leaves(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id, role: user!.role });
      const raw = await api.get<any[]>(`/api/leaves?${params}`);
      return normalizeLeaves(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000,
  });
}

export function useLeaveBalances() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.leaveBalances(user?.id || ''),
    queryFn: async () => {
      try {
        const raw = await api.get<any[]>(`/api/leave-balances?userId=${user!.id}`);
        const lb: LeaveBalance = { sick: { total: 10, used: 0, remaining: 10 }, casual: { total: 12, used: 0, remaining: 12 }, vacation: { total: 15, used: 0, remaining: 15 } };
        if (raw && raw.length > 0) {
          for (const b of raw) {
            const type = normalizeStr(b.leaveType);
            lb[type] = { total: b.total, used: b.used, remaining: b.total - b.used };
          }
        }
        return lb;
      } catch {
        return { sick: { total: 10, used: 0, remaining: 10 }, casual: { total: 12, used: 0, remaining: 12 }, vacation: { total: 15, used: 0, remaining: 15 } } as LeaveBalance;
      }
    },
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000,
  });
}

// ─── Task Queries ───────────────────────────────────────────────────────────

export function useTasks() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.tasks(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id, role: user!.role });
      const raw = await api.get<any[]>(`/api/tasks?${params}`);
      return normalizeTasks(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000,
  });
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.taskComments(taskId || ''),
    queryFn: async () => {
      const raw = await api.get<any[]>(`/api/task-comments?taskId=${taskId}`);
      return (raw || []).map((c: any) => ({
        id: c.id, taskId: c.taskId, userId: c.userId,
        comment: c.comment, userName: c.user?.name || '', createdAt: c.createdAt,
      }));
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

// ─── Request Queries ────────────────────────────────────────────────────────

export function useRequests() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.requests(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id, role: user!.role });
      const raw = await api.get<any[]>(`/api/requests?${params}`);
      return normalizeRequests(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000,
  });
}

// ─── Complaint Queries ──────────────────────────────────────────────────────

export function useComplaints() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.complaints(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id, role: user!.role });
      const raw = await api.get<any[]>(`/api/complaints?${params}`);
      return normalizeComplaints(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30 * 1000,
  });
}

// ─── Notification Queries ───────────────────────────────────────────────────

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications(user?.id || ''),
    queryFn: async () => {
      const raw = await api.get<any[]>(`/api/notifications?userId=${user!.id}`);
      return normalizeNotifications(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 15 * 1000, // Short stale time for notifications
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  });
}

// ─── Payroll Queries ────────────────────────────────────────────────────────

export function usePayroll() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.payroll(user?.id || '', user?.role || ''),
    queryFn: async () => {
      const url = user?.role === 'admin' ? '/api/payroll' : `/api/payroll?userId=${user!.id}`;
      const raw = await api.get<any[]>(url);
      return normalizePayroll(raw);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000,
  });
}

// ─── Team Queries ───────────────────────────────────────────────────────────

export function useTeams() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.teams,
    queryFn: async () => {
      const raw = await api.get<any[]>('/api/teams');
      return normalizeTeams(raw);
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Analytics Queries ──────────────────────────────────────────────────────

export function useAnalytics() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.analytics(user?.departmentId || ''),
    queryFn: async () => {
      return await api.get<AnalyticsData | null>(`/api/analytics?departmentId=${user?.departmentId || ''}`);
    },
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Settings Queries ───────────────────────────────────────────────────────

export function useSettings() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      try {
        return await api.get<SystemSettings>('/api/settings');
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Rules Queries ──────────────────────────────────────────────────────────

export function useRules() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.rules,
    queryFn: async () => {
      const raw = await api.get<any[]>('/api/rules');
      return normalizeRules(raw);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── File Upload Queries ────────────────────────────────────────────────────

export function useFiles(entityType: string, entityId: string) {
  return useQuery({
    queryKey: queryKeys.files(entityType, entityId),
    queryFn: async () => {
      return await api.get<any[]>(`/api/files?entityType=${entityType}&entityId=${entityId}`);
    },
    enabled: !!entityType && !!entityId,
    staleTime: 5 * 60 * 1000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Write operations that auto-invalidate queries
// ═══════════════════════════════════════════════════════════════════════════════

const qc = () => useQueryClient();

// ─── Attendance Mutations ───────────────────────────────────────────────────

export function useClockIn() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (params: { method: 'face' | 'pin' | 'web'; gpsData?: { latitude: number; longitude: number; accuracy?: number }; pin?: string; faceImage?: string }) => {
      return await api.post('/api/attendance', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(user?.id || '', user?.role || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceLogs(user?.id || '', user?.role || '') });
    },
  });
}

export function useClockOut() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (params?: { gpsData?: { latitude: number; longitude: number; accuracy?: number } }) => {
      return await api.post('/api/attendance', { punchType: 'CLOCK_OUT', ...params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(user?.id || '', user?.role || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceLogs(user?.id || '', user?.role || '') });
    },
  });
}

// ─── Leave Mutations ────────────────────────────────────────────────────────

export function useApplyLeave() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (leave: Omit<Leave, 'id' | 'status' | 'createdAt' | 'userName'>) => {
      return await api.post('/api/leaves', leave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves(user?.id || '', user?.role || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id || '') });
    },
  });
}

// ─── Task Mutations ─────────────────────────────────────────────────────────

export function useCreateTask() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'createdAt'>) => {
      return await api.post('/api/tasks', task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(user?.id || '', user?.role || '') });
    },
  });
}

export function useUpdateTask() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      return await api.put(`/api/tasks?id=${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(user?.id || '', user?.role || '') });
    },
  });
}

export function useDeleteTask() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/tasks?id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(user?.id || '', user?.role || '') });
    },
  });
}

export function useAddTaskComment() {
  const queryClient = qc();
  return useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: string; comment: string }) => {
      return await api.post('/api/task-comments', { taskId, comment });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(variables.taskId) });
    },
  });
}

// ─── Request Mutations ──────────────────────────────────────────────────────

export function useCreateRequest() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (request: Omit<Request, 'id' | 'status' | 'createdAt' | 'userName'>) => {
      return await api.post('/api/requests', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests(user?.id || '', user?.role || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id || '') });
    },
  });
}

// ─── Complaint Mutations ────────────────────────────────────────────────────

export function useCreateComplaint() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (complaint: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'userName' | 'resolvedBy' | 'resolverName' | 'resolvedAt' | 'escalatorName' | 'closedAt' | 'assigneeName'>) => {
      return await api.post('/api/complaints', complaint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complaints(user?.id || '', user?.role || '') });
    },
  });
}

// ─── Notification Mutations ─────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.post('/api/notification-action', { notificationId: id, action: 'read' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id || '') });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async () => {
      const userId = useUIStore.getState().user?.id;
      return await api.post('/api/notifications', { userId, action: 'markAllRead' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id || '') });
    },
  });
}

export function useExecuteNotificationAction() {
  const queryClient = qc();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async ({ notificationId, action, comment }: { notificationId: string; action: 'approve' | 'reject' | 'acknowledge'; comment?: string }) => {
      return await api.post('/api/notification-action', { notificationId, action, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id || '') });
      // Also invalidate related entity queries
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ─── File Upload Mutation ───────────────────────────────────────────────────

export function useUploadFile() {
  const queryClient = qc();
  return useMutation({
    mutationFn: async ({ entityType, entityId, file, category }: { entityType: string; entityId: string; file: File; category?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      if (category) formData.append('category', category);
      return await api.upload<any>('/api/files', formData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files(variables.entityType, variables.entityId) });
    },
  });
}

export function useDeleteFile() {
  const queryClient = qc();
  return useMutation({
    mutationFn: async ({ fileId, entityType, entityId }: { fileId: string; entityType: string; entityId: string }) => {
      return await api.delete(`/api/files?id=${fileId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files(variables.entityType, variables.entityId) });
    },
  });
}

// ─── Investment Declaration Mutations ───────────────────────────────────────

export function useInvestments(userId: string) {
  return useQuery({
    queryKey: queryKeys.investments(userId),
    queryFn: async () => {
      return await api.get<InvestmentDeclaration[]>(`/api/tax-simulator?userId=${userId}`);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// ─── Team Mutations ─────────────────────────────────────────────────────────

export function useCreateTeam() {
  const queryClient = qc();
  return useMutation({
    mutationFn: async ({ name, description, members, departmentId, color }: { name: string; description: string; members: Array<{ userId: string; role: string }>; departmentId?: string; color?: string }) => {
      return await api.post('/api/teams', { name, description, members, departmentId, color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
}
