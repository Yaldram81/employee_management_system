export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  departmentId: string;
  department?: string;
  avatar?: string;
  phone?: string;
  position?: string;
  joinDate?: string;
  salary?: number;
  isActive?: boolean;
  workMode?: string;
  shiftId?: string;
  shiftName?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  location?: string;
  budget?: number;
  managerId?: string;
  managerName?: string;
  employeeCount?: number;
  isActive?: boolean;
  createdAt?: string;
  teamCount?: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  firstIn?: string;    // HH:MM:SS
  lastOut?: string;    // HH:MM:SS
  clockIn?: string;    // Keep for backward compat, maps to firstIn
  clockOut?: string;   // Keep for backward compat, maps to lastOut
  totalHours?: number;
  breakMinutes?: number; // Total break minutes
  breakHours?: number;   // Computed: breakMinutes / 60
  netWorkHours?: number; // Computed: totalHours - breakHours
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'weekend';
  method?: 'face' | 'pin' | 'manual' | 'web';
  overtimeHours?: number;
  workMode?: string;       // OFFICE, REMOTE, HYBRID
  gpsLatitude?: number;
  gpsLongitude?: number;
  locationName?: string;   // Detected location name
  isGeofenceOk?: boolean;  // True if within office geofence
  isEdited?: boolean;
  editedBy?: string;
  note?: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName?: string;
  punchType: 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  punchTime: string; // ISO timestamp
  method: 'face' | 'pin' | 'manual' | 'web';
  confidence?: number;
  ipAddress?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  locationName?: string;
  deviceId?: string;
  isFlagged: boolean;
  flagReason?: string;
  isBreak?: boolean;
  editedBy?: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  gracePeriod: number; // minutes
  halfDayMin: number; // hours
  overtimeThreshold: number; // hours
  isDefault: boolean;
  color?: string; // UI accent color
  employeeCount?: number; // Number of employees assigned
}

export interface Leave {
  id: string;
  userId: string;
  userName?: string;
  type: 'sick' | 'casual' | 'vacation' | 'maternity' | 'paternity' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  managerId?: string;
  managerComment?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'in-review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  assigneeName?: string;
  reporterId?: string;
  reporterName?: string;
  departmentId?: string;
  teamId?: string;
  teamName?: string;
  parentTaskId?: string;
  isBlocked: boolean;
  blockedReason?: string;
  performanceScore?: number;
  completedAt?: string;
  dueDate?: string;
  createdAt: string;
  tags?: string[];
  subTasks?: Task[];
  commentCount?: number;
  comments?: TaskComment[];
}

export interface Request {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userDepartment?: string;
  type: 'leave' | 'expense' | 'asset' | 'shift-swap' | 'training' | 'equipment' | 'travel' | 'it-support';
  title: string;
  description: string;
  status: 'pending' | 'under-review' | 'approved' | 'rejected' | 'cancelled' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reviewedBy?: string;
  reviewerName?: string;
  reviewComment?: string;
  amount?: number;
  departmentId?: string;
  departmentName?: string;
  dueDate?: string;
  attachmentUrls?: string[];
  resolvedAt?: string;
  cancelledAt?: string;
  escalatedAt?: string;
  escalatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Complaint {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userDepartment?: string;
  subject: string;
  description: string;
  category: 'hr' | 'it' | 'facilities' | 'finance' | 'management' | 'security' | 'general' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'in-progress' | 'resolved' | 'closed' | 'escalated';
  isAnonymous: boolean;
  resolution?: string;
  resolvedBy?: string;
  resolverName?: string;
  resolvedAt?: string;
  departmentId?: string;
  departmentName?: string;
  assignedToId?: string;
  assigneeName?: string;
  escalatedAt?: string;
  escalatedBy?: string;
  escalatorName?: string;
  closedAt?: string;
  dueDate?: string;
  attachmentUrls?: string[];
  severity: 'normal' | 'sensitive' | 'critical';
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationActionData {
  entityType: 'leave' | 'request' | 'task' | 'complaint';
  entityId: string;
  actions: Array<'approve' | 'reject' | 'acknowledge' | 'view'>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'approval-required' | 'attendance' | 'leave-update' | 'task-assigned' | 'complaint-update' | 'general';
  isRead: boolean;
  link?: string;
  actionData?: NotificationActionData | null;
  createdAt: string;
}

export interface SystemRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  isActive: boolean;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userDepartment?: string;
  userPosition?: string;
  month: string;
  baseSalary: number;
  overtime: number;
  allowances: number;
  bonus: number;
  tax: number;
  insurance: number;
  providentFund: number;
  otherDeductions: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'draft' | 'reviewed' | 'approved' | 'paid' | 'on-hold' | 'cancelled';
  paymentMethod: 'bank-transfer' | 'cash' | 'check' | 'digital-wallet';
  bankName?: string;
  bankAccount?: string;
  notes?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  generatedAt: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryStructure {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userDepartment?: string;
  baseSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  foodAllowance: number;
  otherAllowances: number;
  overtimeRate: number;
  taxPercentage: number;
  insuranceRate: number;
  providentFundRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  bankName?: string;
  bankAccount?: string;
  paymentMethod: 'bank-transfer' | 'cash' | 'check' | 'digital-wallet';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollDashboardData {
  metrics: {
    totalEmployees: number;
    totalPayroll: number;
    totalDeductions: number;
    totalBonuses: number;
    totalOvertime: number;
    totalTax: number;
    avgSalary: number;
    draftCount: number;
    reviewedCount: number;
    approvedCount: number;
    paidCount: number;
    onHoldCount: number;
    pendingAmount: number;
    paidAmount: number;
  };
  monthlyTrend: Array<{ month: string; total: number; paid: number; pending: number }>;
  deptBreakdown: Array<{ department: string; total: number; employees: number; avgSalary: number }>;
  recentActivity: Array<{
    id: string; userId: string; userName: string; action: string;
    month: string; amount: number; timestamp: string;
  }>;
  salaryStructures: SalaryStructure[];
}

export interface LeaveBalance {
  sick: { total: number; used: number; remaining: number };
  casual: { total: number; used: number; remaining: number };
  vacation: { total: number; used: number; remaining: number };
  [key: string]: { total: number; used: number; remaining: number };
}

export interface AnalyticsData {
  attendanceRate: { month: string; rate: number }[];
  departmentTasks: { department: string; completed: number; pending: number }[];
  leaveUsage: { type: string; count: number }[];
  payrollSummary: { month: string; total: number }[];
  performanceMetrics: {
    attendanceRate: number;
    taskCompletion: number;
    leaveUsage: number;
    onTimeRate: number;
  };
}

export interface SystemSettings {
  timezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  currency: string;
  dateFormat?: string;
  language?: string;
  lateThreshold: number;
  overtimeThreshold?: number;
  workingDays?: string[];
  fiscalYearStart?: string;
  holidays: string[];
  modules: Record<string, boolean>;
  security?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  organization?: Record<string, unknown>;
  advanced?: Record<string, unknown>;
}

export type ActiveView = 'dashboard' | 'attendance' | 'leaves' | 'tasks' | 'requests' | 'complaints' | 'analytics' | 'settings' | 'payroll' | 'employees' | 'rules' | 'team' | 'departments' | 'create-team' | 'shifts' | 'hrm' | 'onboarding' | 'jobs' | 'candidates' | 'training-mgmt' | 'job-detail' | 'candidate-detail' | 'onboarding-detail' | 'training-detail' | 'task-detail' | 'complaint-detail' | 'request-detail' | 'submit-complaint' | 'submit-request' | 'apply-leave' | 'gamification';

// ─── HRM (Human Resource Management) ────────────────────────────
export interface JobPosting {
  id: string;
  title: string;
  departmentId: string;
  departmentName?: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'draft' | 'open' | 'paused' | 'closed' | 'filled';
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  experience: string;
  skills: string[];
  description?: string;
  postedDate: string;
  closingDate?: string;
  applicantCount: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobPostingId: string;
  jobTitle?: string;
  stage: 'applied' | 'screening' | 'interview' | 'assessment' | 'offer' | 'hired' | 'rejected';
  rating: number; // 0-5
  source: 'referral' | 'linkedin' | 'website' | 'job-board' | 'agency' | 'other';
  appliedDate: string;
  notes?: string;
  avatar?: string;
}

export interface OnboardingPlan {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  departmentName?: string;
  startDate: string;
  endDate?: string;
  progress: number; // 0-100
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue';
  buddyId?: string;
  buddyName?: string;
  mentorId?: string;
  mentorName?: string;
  tasks: OnboardingTask[];
  createdAt: string;
}

export interface OnboardingTask {
  id: string;
  title: string;
  category: 'documentation' | 'setup' | 'training' | 'introduction' | 'review';
  isCompleted: boolean;
  dueDay: number; // Day number from start
  completedAt?: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description?: string;
  category: 'technical' | 'leadership' | 'compliance' | 'soft-skills' | 'safety' | 'onboarding';
  format: 'online' | 'in-person' | 'hybrid' | 'self-paced';
  duration: string;
  enrollmentCount: number;
  maxEnrollment?: number;
  rating: number; // 0-5
  status: 'upcoming' | 'active' | 'completed' | 'archived';
  hasCertification: boolean;
  startDate: string;
  endDate?: string;
  instructor?: string;
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userDepartment?: string;
  cycleName: string;
  status: 'not-started' | 'self-assessment' | 'manager-review' | 'calibration' | 'completed';
  rating: number; // 0-5
  goalScore?: number;
  competencyScore?: number;
  reviewerId?: string;
  reviewerName?: string;
  dueDate: string;
  completedAt?: string;
  createdAt: string;
}

export interface LifecycleEvent {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userDepartment?: string;
  type: 'hire' | 'transfer' | 'promotion' | 'resignation' | 'termination' | 'contract-end';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  effectiveDate: string;
  details: string;
  fromValue?: string; // e.g. old department, old position
  toValue?: string;   // e.g. new department, new position
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface HRMData {
  jobPostings: JobPosting[];
  candidates: Candidate[];
  onboardingPlans: OnboardingPlan[];
  trainingPrograms: TrainingProgram[];
  performanceReviews: PerformanceReview[];
  lifecycleEvents: LifecycleEvent[];
}

// ─── Admin Leave Management (Air Traffic Control) ────────────────
export interface LeavePolicy {
  id: string;
  name: string;
  type: string;
  annualQuota: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  documentThresholdDays: number;
  carriesForward: boolean;
  maxCarryForward: number;
  isEncashable: boolean;
  isPaid: boolean;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  type: string;
  isRecurring: boolean;
}

export interface LeaveBalanceRecord {
  id: string;
  userId: string;
  userName: string;
  department: string;
  leaveType: string;
  total: number;
  used: number;
  carriedForward: number;
  year: number;
}

export interface TimelineLeave {
  id: string;
  userId: string;
  userName: string;
  department: string;
  departmentId: string | null;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  managerName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  attachmentUrl: string | null;
}

export interface AdminLeaveData {
  metrics: {
    totalWorkforce: number;
    onLeaveToday: number;
    pendingEscalations: number;
    totalPending: number;
    financialLiability: number;
    deptOverlaps: Array<{ department: string; count: number; employees: string[] }>;
    isLockdown: boolean;
  };
  escalated: Array<{
    id: string;
    userId: string;
    userName: string;
    department: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  recentPending: Array<{
    id: string;
    userId: string;
    userName: string;
    department: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  timelineLeaves: TimelineLeave[];
  policies: LeavePolicy[];
  holidays: CompanyHoliday[];
  liabilityByUser: Array<{
    userId: string; userName: string; department: string;
    leaveType: string; unused: number; value: number;
  }>;
  allLeaveBalances: LeaveBalanceRecord[];
  allLeaves: Array<{
    id: string; userId: string; userName: string; department: string;
    type: string; startDate: string; endDate: string; reason: string;
    status: string; managerName: string | null; createdAt: string;
    reviewedAt: string | null; attachmentUrl: string | null;
  }>;
  currentLeaves: Array<{
    userId: string; userName: string; type: string;
    startDate: string; endDate: string;
  }>;
}

// ─── Manager Leave Portal ─────────────────────────────
export interface ManagerLeaveData {
  departmentName: string;
  teamSize: number;
  metrics: {
    onLeaveToday: number;
    pendingApprovals: number;
    escalatedCount: number;
    teamUtilization: number;
    coverageRisk: number;
    thisMonthLeaves: number;
  };
  pendingLeaves: Array<{
    id: string; userId: string; userName: string; userEmail: string;
    department: string; type: string; startDate: string; endDate: string;
    reason: string; status: string; createdAt: string;
    isEscalated: boolean; daysCount: number;
  }>;
  teamBalances: Array<{
    id: string; userId: string; userName: string; department: string;
    leaveType: string; total: number; used: number; remaining: number;
    carriedForward: number; year: number;
  }>;
  upcomingLeaves: Array<{
    id: string; userId: string; userName: string;
    type: string; startDate: string; endDate: string;
  }>;
  overlapDates: Array<{ date: string; count: number; members: string[] }>;
  coverageRiskDays: Array<{ date: string; count: number; members: string[] }>;
  allTeamLeaves: Array<{
    id: string; userId: string; userName: string; department: string;
    type: string; startDate: string; endDate: string; reason: string;
    status: string; managerName: string | null; createdAt: string;
    reviewedAt: string | null;
  }>;
  holidays: CompanyHoliday[];
  policies: LeavePolicy[];
  monthlyStats: Array<{
    month: string; year: number; leaveDays: number; leaveCount: number;
  }>;
  typeDistribution: Record<string, number>;
  teamMembers: Array<{ id: string; name: string; email: string; department: string }>;
}

// ─── Admin Attendance Command Center ─────────────────────────────
export interface AdminAttendanceMetrics {
  totalWorkforce: number;
  presentToday: number;
  lateToday: number;
  onLeaveToday: number;
  checkedIn: number;
  attendanceRate: number;
}

export interface MissedPunch {
  userId: string;
  userName: string;
  department: string;
  firstIn: string;
  attendanceId: string;
  type: 'missed-clock-out';
}

export interface IPMismatch {
  userId: string;
  userName: string;
  department: string;
  method: string;
  ipAddress: string | null;
  flagReason: string | null;
  logId: string;
  type: 'ip-mismatch';
}

export interface RuleViolation {
  userId: string;
  userName: string;
  department: string;
  lateCount: number;
  type: 'rule-violation';
}

export interface RosterEntry {
  userId: string;
  userName: string;
  email: string;
  department: string;
  departmentId: string | null;
  avatar: string | null;
  workMode: string;
  status: string;
  firstIn: string | null;
  lastOut: string | null;
  totalHours: number | null;
  overtimeHours: number | null;
  isEdited: boolean;
  editedBy: string | null;
  isFlagged: boolean;
  attendanceId: string | null;
  sparklineData: number[];
  punchLogs: Array<{
    id: string;
    punchType: string;
    punchTime: string;
    method: string;
    confidence: number | null;
    ipAddress: string | null;
    isFlagged: boolean;
    flagReason: string | null;
    editedBy: string | null;
  }>;
}

export interface AdminAttendanceData {
  date: string;
  metrics: AdminAttendanceMetrics;
  anomalies: {
    missedPunches: MissedPunch[];
    ipMismatches: IPMismatch[];
    ruleViolations: RuleViolation[];
  };
  roster: RosterEntry[];
  employeeYearMap: Record<string, Array<{
    date: string;
    status: string;
    firstIn: string | null;
    lastOut: string | null;
    totalHours: number | null;
    isEdited: boolean;
    editedBy: string | null;
    note: string | null;
  }>>;
  todayLogs: Array<{
    id: string;
    userId: string;
    userName: string;
    punchType: string;
    punchTime: string;
    method: string;
    confidence: number | null;
    ipAddress: string | null;
    isFlagged: boolean;
    flagReason: string | null;
    editedBy: string | null;
  }>;
  todayLeaves: Array<{
    userId: string;
    userName: string;
    type: string;
    startDate: string;
    endDate: string;
  }>;
}

// ─── Enterprise Task Management System ──────────────────────────
export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  departmentId?: string;
  departmentName?: string;
  createdBy: string;
  isActive?: boolean;
  members?: TeamMemberRecord[];
  memberCount?: number;
  taskCount?: number;
  createdAt: string;
}

export interface TeamMemberRecord {
  id: string;
  teamId: string;
  userId: string;
  role: 'LEAD' | 'MEMBER';
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  userName?: string;
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  taskItems: string; // JSON string
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// ─── Team Availability & Leave Reports ──────────────────────────
export interface TeamAvailabilityData {
  dateRange: { start: string; end: string };
  members: Array<{
    id: string; name: string; department: string;
    availability: Array<{ date: string; status: 'available' | 'on-leave' | 'partial' }>;
  }>;
}

export interface LeaveReportData {
  period: { start: string; end: string };
  summary: {
    totalLeaves: number;
    totalDays: number;
    avgDaysPerMember: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  memberBreakdown: Array<{
    userId: string; userName: string; totalDays: number; byType: Record<string, number>;
  }>;
}

export interface AdminTMSData {
  metrics: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    blockedTasks: number;
    inReviewTasks: number;
    overdueTasks: number;
  };
  bottleneckRadar: Array<{
    department: string;
    openTasks: number;
    completedTasks: number;
    ratio: number;
  }>;
  teams: Array<Team & { memberCount: number; taskCount: number }>;
  templates: TaskTemplate[];
  epics: Task[];
  allTasks: Task[];
}

// ─── Manager Task Management ─────────────────────────────
export interface ManagerTaskData {
  departmentName: string;
  teamSize: number;
  metrics: {
    totalTasks: number;
    todoCount: number;
    inProgressCount: number;
    inReviewCount: number;
    doneCount: number;
    blockedCount: number;
    overdueCount: number;
    completedThisWeek: number;
    avgCompletionDays: number;
  };
  velocityData: Array<{ week: string; completed: number; created: number }>;
  workloadData: Array<{
    userId: string; userName: string;
    total: number; todo: number; inProgress: number; done: number;
  }>;
  tasks: Task[];
  reviewQueue: Task[];
  recentActivity: Array<{
    taskId: string; taskTitle: string; action: string;
    userName: string; timestamp: string;
  }>;
}

// ─── Investment Declaration (Tax Simulator) ──────────────────────────
export interface InvestmentDeclaration {
  id: string;
  userId: string;
  category: '401k' | 'hsa' | 'insurance' | 'education' | 'home-loan' | 'charity' | 'nps' | 'other';
  description: string;
  amount: number;
  proofUrl?: string;
  proofName?: string;
  fiscalYear: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewComment?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaxSimulationResult {
  currentGross: number;
  currentDeductions: number;
  currentTax: number;
  currentNet: number;
  newGross: number;
  newDeductions: number;
  newTax: number;
  newNet: number;
  takeHomeChange: number;
  takeHomeChangePct: number;
  breakdown: {
    baseSalary: number;
    allowances: number;
    tax: number;
    insurance: number;
    providentFund: number;
    otherDeductions: number;
  };
}

export interface TaxOptimizationTip {
  id: string;
  title: string;
  description: string;
  potentialSaving: number;
  category: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
}

export interface MarketBenchmark {
  position: string;
  department: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  yourSalary: number;
  percentile: number;
}
