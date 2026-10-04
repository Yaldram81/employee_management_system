'use client';

import { useEMSStore } from '@/lib/store';
import { AdminTMSCommandCenter } from './admin-tms-command-center';
import { ManagerTMSBoard } from './manager-tms-board';
import { EmployeeTaskCenter } from './employee-task-center';

export function TasksView() {
  const user = useEMSStore((s) => s.user);

  if (user?.role === 'admin') {
    return <AdminTMSCommandCenter />;
  }

  if (user?.role === 'manager') {
    return <ManagerTMSBoard />;
  }

  return <EmployeeTaskCenter />;
}
