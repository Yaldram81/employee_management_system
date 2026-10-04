/**
 * Barrel export for all shared EMS modules.
 * Import from '@/components/ems/shared' for convenience.
 */

// Utilities
export {
  timeAgo,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatCurrency,
  getInitials,
  getGreeting,
  getGreetingEmoji,
  daysBetween,
  workingDaysBetween,
  daysUntil,
  getRequestAge,
  daysUntilYearEnd,
  priorityWeight,
  isOverdue,
  daysUntilDue,
  formatDateLong,
  getAvatarColor,
  getGreetingWithIcon,
} from './utils';

// Animations
export {
  fadeIn,
  fadeInSm,
  stagger,
  staggerFast,
  scaleIn,
  slideInRight,
  slideInLeft,
} from './animations';

// Config maps
export {
  priorityDot,
  priorityLabel,
  priorityLabelEmoji,
  priorityColor,
  priorityBg,
  attendanceStatusColorMap,
  attendanceStatusDotMap,
  requestStatusColorMap,
  complaintStatusChipColor,
  leaveStatusDotMap,
  workModeConfig,
  leaveTypeConfig,
  requestTypeConfig,
  requestTypeColors,
  requestTypeColorHex,
  slaDays,
  actionColorMap,
} from './config-maps';

export type { LeaveTypeConfig } from './config-maps';

// Chart components
export {
  ProgressRing,
  DonutChart,
  MiniBarChart,
  PipelineStage,
  TaskKanbanMini,
  LiveClock,
  RingChart,
  SalaryDonutChart,
  MiniDonut,
  AnimatedProgressRing,
} from './charts';

export type {
  ProgressRingProps,
  DonutChartSegment,
  DonutChartProps,
  MiniBarChartProps,
  PipelineStageProps,
  TaskKanbanMiniProps,
  RingChartProps,
  SalaryDonutChartProps,
  MiniDonutProps,
  AnimatedProgressRingProps,
} from './charts';

// Types
export type {
  ActivityItem,
  CommentItem,
  SlaStatus,
  CalendarDay,
} from './types';

// TeamAvailabilityHeatMap
export { TeamAvailabilityHeatMap } from './team-availability-heatmap';
export type { HeatmapDay, TeamAvailabilityHeatMapProps } from './team-availability-heatmap';

// LeavePlanner
export { LeavePlanner } from './leave-planner';
export type { PlannedLeave, LeaveTypeBalance, LeavePlannerProps } from './leave-planner';

// Skeletons
export { StatCardsSkeleton, TabBarSkeleton, ListSkeleton, TableSkeleton, PageSkeleton } from './skeletons';

// Shared Component Library (new architecture)
export {
  DataCard,
  StatusBadge,
  EmptyState,
  FileUploader,
  FilterBar,
  ConfirmationDialog,
  PaginatedTable,
  ErrorFallback,
} from './components';
