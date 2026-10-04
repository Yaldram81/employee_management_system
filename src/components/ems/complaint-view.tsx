'use client';

import { useEMSStore } from '@/lib/store';
import { AdminComplaintCommandCenter } from './admin-complaint-command-center';
import { ManagerComplaintReviewBoard } from './manager-complaint-review-board';
import { EmployeeComplaintCenter } from './employee-complaint-center';

export function ComplaintView() {
  const { user } = useEMSStore();

  if (user?.role === 'admin') {
    return <AdminComplaintCommandCenter />;
  }

  if (user?.role === 'manager') {
    return <ManagerComplaintReviewBoard />;
  }

  return <EmployeeComplaintCenter />;
}
