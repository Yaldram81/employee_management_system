'use client';

import { useEMSStore } from '@/lib/store';
import { AdminAttendanceCommandCenter } from './admin-attendance-command-center';
import { ManagerAttendancePortal } from './manager-attendance-portal';
import { EmployeeAttendancePortal } from './employee-attendance-portal';

// ─── Main Router: Role-based attendance views ──────────────────────
export function AttendanceView() {
  const user = useEMSStore((s) => s.user);

  if (user?.role === 'admin') {
    return <AdminAttendanceCommandCenter />;
  }

  if (user?.role === 'manager') {
    return <ManagerAttendancePortal />;
  }

  return <EmployeeAttendancePortal />;
}
