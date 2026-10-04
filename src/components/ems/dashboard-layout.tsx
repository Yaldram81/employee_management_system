'use client';

import dynamic from 'next/dynamic';
import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEMSStore } from '@/lib/store';
import { useUIStore } from '@/lib/ui-store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, ChevronRight, Home } from 'lucide-react';
import type { ActiveView } from '@/lib/types';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

// Dynamically import the realtime hook wrapper to avoid socket.io-client
// being bundled in the main page chunk (which blocks Turbopack compilation)
const RealtimeProvider = dynamic(() => import('./realtime-provider').then(m => ({ default: m.RealtimeProvider })), {
  ssr: false,
});

/* ---------- Dynamic imports (lazy-loaded, SSR disabled) ---------- */

const AttendanceView = dynamic(() => import('./attendance-view').then(m => ({ default: m.AttendanceView })), { ssr: false, loading: LoadingSpinner });
const LeaveView = dynamic(() => import('./leave-view').then(m => ({ default: m.LeaveView })), { ssr: false, loading: LoadingSpinner });
const TasksView = dynamic(() => import('./tasks-view').then(m => ({ default: m.TasksView })), { ssr: false, loading: LoadingSpinner });
const RequestView = dynamic(() => import('./request-view').then(m => ({ default: m.RequestView })), { ssr: false, loading: LoadingSpinner });
const ComplaintView = dynamic(() => import('./complaint-view').then(m => ({ default: m.ComplaintView })), { ssr: false, loading: LoadingSpinner });
const AnalyticsView = dynamic(() => import('./analytics-view').then(m => ({ default: m.AnalyticsView })), { ssr: false, loading: LoadingSpinner });
const SettingsView = dynamic(() => import('./settings-view').then(m => ({ default: m.SettingsView })), { ssr: false, loading: LoadingSpinner });
const PayrollView = dynamic(() => import('./payroll-view').then(m => ({ default: m.PayrollView })), { ssr: false, loading: LoadingSpinner });
const TeamView = dynamic(() => import('./team-view').then(m => ({ default: m.TeamView })), { ssr: false, loading: LoadingSpinner });
const DepartmentView = dynamic(() => import('./admin-department-center').then(m => ({ default: m.AdminDepartmentCenter })), { ssr: false, loading: LoadingSpinner });
const ShiftCenter = dynamic(() => import('./admin-shift-center').then(m => ({ default: m.AdminShiftCenter })), { ssr: false, loading: LoadingSpinner });
const CreateTeamPage = dynamic(() => import('./create-team-page').then(m => ({ default: m.CreateTeamPage })), { ssr: false, loading: LoadingSpinner });
const UserManagement = dynamic(() => import('./user-management').then(m => ({ default: m.UserManagement })), { ssr: false, loading: LoadingSpinner });
const RulesEngine = dynamic(() => import('./rules-engine').then(m => ({ default: m.RulesEngine })), { ssr: false, loading: LoadingSpinner });
const HRMView = dynamic(() => import('./hrm-view').then(m => ({ default: m.HRMView })), { ssr: false, loading: LoadingSpinner });
const OnboardingManagement = dynamic(() => import('./onboarding-management').then(m => ({ default: m.OnboardingManagement })), { ssr: false, loading: LoadingSpinner });
const JobManagement = dynamic(() => import('./job-management').then(m => ({ default: m.JobManagement })), { ssr: false, loading: LoadingSpinner });
const CandidateManagement = dynamic(() => import('./candidate-management').then(m => ({ default: m.CandidateManagement })), { ssr: false, loading: LoadingSpinner });
const TrainingManagement = dynamic(() => import('./training-management').then(m => ({ default: m.TrainingManagement })), { ssr: false, loading: LoadingSpinner });
const TrainingDetail = dynamic(() => import('./training-detail').then(m => ({ default: m.TrainingDetail })), { ssr: false, loading: LoadingSpinner });
const JobDetail = dynamic(() => import('./job-detail').then(m => ({ default: m.JobDetail })), { ssr: false, loading: LoadingSpinner });
const CandidateDetail = dynamic(() => import('./candidate-detail').then(m => ({ default: m.CandidateDetail })), { ssr: false, loading: LoadingSpinner });
const OnboardingDetail = dynamic(() => import('./onboarding-detail').then(m => ({ default: m.OnboardingDetail })), { ssr: false, loading: LoadingSpinner });
const EmployeeComplaintDetailView = dynamic(() => import('./employee-complaint-detail-view').then(m => ({ default: m.EmployeeComplaintDetailView })), { ssr: false, loading: LoadingSpinner });
const EmployeeTaskDetailView = dynamic(() => import('./employee-task-detail-view').then(m => ({ default: m.EmployeeTaskDetailView })), { ssr: false, loading: LoadingSpinner });
const EmployeeRequestDetailView = dynamic(() => import('./employee-request-detail-view').then(m => ({ default: m.EmployeeRequestDetailView })), { ssr: false, loading: LoadingSpinner });
const EmployeeLeaveDetailView = dynamic(() => import('./employee-leave-detail-view').then(m => ({ default: m.EmployeeLeaveDetailView })), { ssr: false, loading: LoadingSpinner });
const EmployeeDashboard = dynamic(() => import('./employee-dashboard').then(m => ({ default: m.EmployeeDashboard })), { ssr: false, loading: LoadingSpinner });
const ManagerDashboard = dynamic(() => import('./manager-dashboard').then(m => ({ default: m.ManagerDashboard })), { ssr: false, loading: LoadingSpinner });
const AdminDashboard = dynamic(() => import('./admin-dashboard').then(m => ({ default: m.AdminDashboard })), { ssr: false, loading: LoadingSpinner });

// Employee-specific view components
const EmployeeLeavePortal = dynamic(() => import('./employee-leave-portal').then(m => ({ default: m.EmployeeLeavePortal })), { ssr: false, loading: LoadingSpinner });
const EmployeePayrollCenter = dynamic(() => import('./employee-payroll-center').then(m => ({ default: m.EmployeePayrollCenter })), { ssr: false, loading: LoadingSpinner });
const EmployeeProfilePortal = dynamic(() => import('./employee-profile-portal').then(m => ({ default: m.EmployeeProfilePortal })), { ssr: false, loading: LoadingSpinner });
const EmployeeAttendancePortal = dynamic(() => import('./employee-attendance-portal').then(m => ({ default: m.EmployeeAttendancePortal })), { ssr: false, loading: LoadingSpinner });
const EmployeeTaskCenter = dynamic(() => import('./employee-task-center').then(m => ({ default: m.EmployeeTaskCenter })), { ssr: false, loading: LoadingSpinner });
const EmployeeRequestCenter = dynamic(() => import('./employee-request-center').then(m => ({ default: m.EmployeeRequestCenter })), { ssr: false, loading: LoadingSpinner });
const EmployeeComplaintCenter = dynamic(() => import('./employee-complaint-center').then(m => ({ default: m.EmployeeComplaintCenter })), { ssr: false, loading: LoadingSpinner });

// Manager-specific view components
const ManagerAttendancePortal = dynamic(() => import('./manager-attendance-portal').then(m => ({ default: m.ManagerAttendancePortal })), { ssr: false, loading: LoadingSpinner });
const ManagerTMSBoard = dynamic(() => import('./manager-tms-board').then(m => ({ default: m.ManagerTMSBoard })), { ssr: false, loading: LoadingSpinner });
const ManagerComplaintReviewBoard = dynamic(() => import('./manager-complaint-review-board').then(m => ({ default: m.ManagerComplaintReviewBoard })), { ssr: false, loading: LoadingSpinner });
const ManagerRequestReviewBoard = dynamic(() => import('./manager-request-review-board').then(m => ({ default: m.ManagerRequestReviewBoard })), { ssr: false, loading: LoadingSpinner });
const ManagerPayrollDashboard = dynamic(() => import('./manager-payroll-dashboard').then(m => ({ default: m.ManagerPayrollDashboard })), { ssr: false, loading: LoadingSpinner });
const ManagerLeavePortal = dynamic(() => import('./manager-leave-portal').then(m => ({ default: m.ManagerLeavePortal })), { ssr: false, loading: LoadingSpinner });
const ManagerTeamCenter = dynamic(() => import('./manager-team-center').then(m => ({ default: m.ManagerTeamCenter })), { ssr: false, loading: LoadingSpinner });
const NotificationPanel = dynamic(() => import('./notification-panel').then(m => ({ default: m.NotificationPanel })), { ssr: false, loading: LoadingSpinner });
const EmployeeGamificationCenter = dynamic(() => import('./employee-gamification-center').then(m => ({ default: m.EmployeeGamificationCenter })), { ssr: false, loading: LoadingSpinner });
const WelcomeModal = dynamic(() => import('./welcome-modal').then(m => ({ default: m.WelcomeModal })), { ssr: false });

const ClockInModal = dynamic(() => import('./clock-in-modal').then(m => ({ default: m.ClockInModal })), { ssr: false, loading: LoadingSpinner });
const CommandPalette = dynamic(() => import('./command-palette').then(m => ({ default: m.CommandPalette })), { ssr: false });
const KeyboardShortcutsDialog = dynamic(() => import('./keyboard-shortcuts-dialog').then(m => ({ default: m.KeyboardShortcutsDialog })), { ssr: false });

// PWA & Accessibility
const PwaInstallPrompt = dynamic(() => import('./pwa-install-prompt').then(m => ({ default: m.PwaInstallPrompt })), { ssr: false });
const AnnouncerProvider = dynamic(() => import('./a11y-announcer').then(m => ({ default: m.AnnouncerProvider })), { ssr: false });

// Lazy-loaded widget components
const ActivityFeed = dynamic(() => import('./activity-feed').then(m => ({ default: m.ActivityFeed })), { ssr: false });
const OrgChart = dynamic(() => import('./org-chart').then(m => ({ default: m.OrgChart })), { ssr: false });

export { ActivityFeed, OrgChart };

/* ---------- Loading fallback ---------- */

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      <p className="text-sm text-muted-foreground">Loading view…</p>
    </div>
  );
}

/* ---------- Error Boundary ---------- */
import { PortalErrorBoundary } from './portal-error-boundary';

/* ---------- View registry ---------- */

function DashboardRouter() {
  const role = useEMSStore((s) => s.user?.role);
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  return <EmployeeDashboard />;
}

const viewComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardRouter,
  attendance: AttendanceView,
  leaves: LeaveView,
  tasks: TasksView,
  requests: RequestView,
  complaints: ComplaintView,
  analytics: AnalyticsView,
  settings: SettingsView,
  payroll: PayrollView,
  employees: UserManagement,
  rules: RulesEngine,
  team: TeamView,
  'create-team': CreateTeamPage,
  departments: DepartmentView,
  shifts: ShiftCenter,
  hrm: HRMView,
  onboarding: OnboardingManagement,
  jobs: JobManagement,
  candidates: CandidateManagement,
  'training-mgmt': TrainingManagement,
  'job-detail': JobDetail,
  'candidate-detail': CandidateDetail,
  'onboarding-detail': OnboardingDetail,
  'training-detail': TrainingDetail,
  'complaint-detail': EmployeeComplaintDetailView,
  'task-detail': EmployeeTaskDetailView,
  'request-detail': EmployeeRequestDetailView,
  'leave-detail': EmployeeLeaveDetailView,
  gamification: EmployeeGamificationCenter,
};

// Manager-specific overrides: when a manager navigates to certain views,
// they see their specialized component instead of the generic one.
const managerViewOverrides: Record<string, React.ComponentType> = {
  attendance: ManagerAttendancePortal,
  leaves: ManagerLeavePortal,
  tasks: ManagerTMSBoard,
  complaints: ManagerComplaintReviewBoard,
  requests: ManagerRequestReviewBoard,
  payroll: ManagerPayrollDashboard,
  team: ManagerTeamCenter,
};

// Employee-specific overrides: when an employee navigates to certain views,
// they see their specialized component instead of the generic one.
// Each is wrapped in its own PortalErrorBoundary so a crash in one view
// shows a nice error fallback without bringing down the entire app.
function withErrorBoundary(Component: React.ComponentType, name: string) {
  return function ErrorBoundedView() {
    return (
      <PortalErrorBoundary portalName={name}>
        <Component />
      </PortalErrorBoundary>
    );
  };
}

const employeeViewOverrides: Record<string, React.ComponentType> = {
  attendance: withErrorBoundary(EmployeeAttendancePortal, 'Attendance Portal'),
  leaves: withErrorBoundary(EmployeeLeavePortal, 'Leave Portal'),
  payroll: withErrorBoundary(EmployeePayrollCenter, 'Payroll Center'),
  settings: withErrorBoundary(EmployeeProfilePortal, 'Profile Portal'),
  tasks: withErrorBoundary(EmployeeTaskCenter, 'Task Center'),
  requests: withErrorBoundary(EmployeeRequestCenter, 'Request Center'),
  complaints: withErrorBoundary(EmployeeComplaintCenter, 'Complaint Center'),
};

const viewBreadcrumbs: Record<string, string> = {
  dashboard: 'Dashboard',
  attendance: 'Attendance',
  leaves: 'Leave Management',
  tasks: 'Task Board',
  requests: 'Requests',
  complaints: 'Complaints',
  analytics: 'Analytics',
  settings: 'Settings',
  payroll: 'Payroll',
  employees: 'Employees',
  rules: 'Rules Engine',
  team: 'Teams',
  'create-team': 'Create Team',
  departments: 'Departments',
  shifts: 'Shift Management',
  hrm: 'Human Resource Management',
  onboarding: 'Onboarding Management',
  jobs: 'Job Postings',
  candidates: 'Candidate Management',
  'training-mgmt': 'Training Programs',
  'job-detail': 'Job Detail',
  'candidate-detail': 'Candidate Detail',
  'onboarding-detail': 'Onboarding Detail',
  'training-detail': 'Training Detail',
  'complaint-detail': 'Complaint Detail',
  'task-detail': 'Task Detail',
  'request-detail': 'Request Detail',
  'leave-detail': 'Leave Detail',
  gamification: 'Gamification Center',
};

function Breadcrumb({ activeView }: { activeView: ActiveView }) {
  const router = useRouter();
  // Nested breadcrumbs for sub-pages
  const parentMap: Partial<Record<ActiveView, { parent: ActiveView; parentLabel: string }>> = {
    'create-team': { parent: 'team', parentLabel: 'Teams' },
    jobs: { parent: 'hrm', parentLabel: 'HRM' },
    candidates: { parent: 'hrm', parentLabel: 'HRM' },
    onboarding: { parent: 'hrm', parentLabel: 'HRM' },
    'training-mgmt': { parent: 'hrm', parentLabel: 'HRM' },
    'job-detail': { parent: 'jobs', parentLabel: 'Job Postings' },
    'candidate-detail': { parent: 'candidates', parentLabel: 'Candidates' },
    'onboarding-detail': { parent: 'onboarding', parentLabel: 'Onboarding' },
    'training-detail': { parent: 'training-mgmt', parentLabel: 'Training' },
    'complaint-detail': { parent: 'complaints', parentLabel: 'Complaints' },
    'task-detail': { parent: 'tasks', parentLabel: 'Tasks' },
    'request-detail': { parent: 'requests', parentLabel: 'Requests' },
    'leave-detail': { parent: 'leaves', parentLabel: 'Leave Management' },
  };
  const parent = parentMap[activeView];

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
      <Home className="h-3 w-3" />
      <span
        className="hover:text-foreground cursor-pointer transition-colors"
        onClick={() => {
          useEMSStore.getState().setActiveView('dashboard');
          router.push('/dashboard');
        }}
      >
        EMS
      </span>
      <ChevronRight className="h-3 w-3" />
      {parent && (
        <>
          <span
            className="hover:text-foreground cursor-pointer transition-colors"
            onClick={() => {
              useEMSStore.getState().setActiveView(parent.parent);
              router.push(`/${parent.parent}`);
            }}
          >
            {parent.parentLabel}
          </span>
          <ChevronRight className="h-3 w-3" />
        </>
      )}
      <span className="text-foreground font-medium">{viewBreadcrumbs[activeView] || 'Dashboard'}</span>
    </div>
  );
}

/* ---------- Main layout ---------- */

export function DashboardLayout() {
  const { activeView, isLoading, sidebarCollapsed, user, settings } = useEMSStore();
  // Use new UI store for UI-only state (migration in progress)
  const role = user?.role;
  const companyName = (settings.organization as Record<string, unknown>)?.companyName as string || 'EMS';

  // Resolve view component: use role-specific overrides, otherwise default
  const ViewComponent = (() => {
    if (role === 'manager' && managerViewOverrides[activeView]) {
      return managerViewOverrides[activeView];
    }
    if (role === 'employee' && employeeViewOverrides[activeView]) {
      return employeeViewOverrides[activeView];
    }
    return viewComponents[activeView] || DashboardRouter;
  })();

  const mainRef = useRef<HTMLElement>(null);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  // Scroll to top when activeView changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeView]);

  // Support browser back/forward buttons (Multi-Page Navigation history)
  useEffect(() => {
    const handlePopState = () => {
      const path = (window.location.pathname.replace(/^\//, '') || 'dashboard') as ActiveView;
      if (path && path !== activeView) {
        useEMSStore.getState().setActiveView(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView]);

  return (
    <AnnouncerProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-emerald-500 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Sidebar — fixed overlay on mobile, relative on desktop */}
      <PortalErrorBoundary portalName="Sidebar">
        <Sidebar />
      </PortalErrorBoundary>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <PortalErrorBoundary portalName="Header">
          <Header />
        </PortalErrorBoundary>
        <main
          ref={mainRef}
          id="main-content"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm text-muted-foreground">Loading workspace...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Breadcrumb activeView={activeView} />
                <PortalErrorBoundary portalName={viewBreadcrumbs[activeView] || 'View'}>
                  <ViewComponent />
                </PortalErrorBoundary>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
        {/* Footer — sticky to bottom */}
        <footer className="border-t border-border px-4 sm:px-6 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground/50 bg-background/50 backdrop-blur-sm shrink-0">
          <span>{companyName} v2.0 — Enterprise Management System</span>
          <RealtimeProvider />
        </footer>
      </div>
      <NotificationPanel />
      <WelcomeModal />
      <ClockInModal />
      <CommandPalette />
      <KeyboardShortcutsDialog />
      <PwaInstallPrompt />
    </div>
    </AnnouncerProvider>
  );
}
