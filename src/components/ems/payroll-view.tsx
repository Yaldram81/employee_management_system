'use client';

import { useEMSStore } from '@/lib/store';
import { AdminPayrollCommandCenter } from './admin-payroll-command-center';
import { ManagerPayrollDashboard } from './manager-payroll-dashboard';
import { EmployeeSalaryPortal } from './employee-salary-portal';

export function PayrollView() {
  const { user } = useEMSStore();

  if (user?.role === 'admin') {
    return <AdminPayrollCommandCenter />;
  }

  if (user?.role === 'manager') {
    return <ManagerPayrollDashboard />;
  }

  return <EmployeeSalaryPortal />;
}
