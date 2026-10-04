'use client';

import { useEMSStore } from '@/lib/store';
import { AdminRequestCommandCenter } from './admin-request-command-center';
import { ManagerRequestReviewBoard } from './manager-request-review-board';
import { EmployeeRequestCenter } from './employee-request-center';

export function RequestView() {
  const { user } = useEMSStore();

  if (user?.role === 'admin') {
    return <AdminRequestCommandCenter />;
  }

  if (user?.role === 'manager') {
    return <ManagerRequestReviewBoard />;
  }

  return <EmployeeRequestCenter />;
}
