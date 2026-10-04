import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Helper to enrich payroll records with user data
async function enrichRecords(records: any[]) {
  const userIds = [...new Set(records.map((r) => r.userId))];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return records.map((r) => ({ ...r, user: userMap.get(r.userId) || null }));
}

/* ── GET: Fetch payroll records & structures ───────────────── */
export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const userIdParam = searchParams.get('userId');
      const month = searchParams.get('month');
      const status = searchParams.get('status');
      const action = searchParams.get('action');

      // Return salary structures
      if (action === 'structures') {
        // Employees can fetch their own salary structure; admins/managers see all
        if (user.role.toLowerCase() === 'employee') {
          const structures = await db.salaryStructure.findMany({
            where: { isActive: true, userId: user.userId },
            include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } } },
            orderBy: { createdAt: 'desc' },
          });
          return NextResponse.json({ status: 'success', data: structures });
        }
        return requireRole(request, ['admin', 'manager'], async () => {
          const structures = await db.salaryStructure.findMany({
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } } },
            orderBy: { createdAt: 'desc' },
          });
          return NextResponse.json({ status: 'success', data: structures });
        });
      }

      const where: Record<string, unknown> = {};

      // Employees can only see their own payroll records
      // Admins see all records (ignore userIdParam unless explicitly filtering)
      // Managers see their department's records
      if (user.role.toLowerCase() === 'employee') {
        where.userId = user.userId;
      } else if (user.role.toLowerCase() === 'manager') {
        // Manager sees records from their department
        const mgr = await db.user.findUnique({ where: { id: user.userId }, select: { departmentId: true } });
        if (mgr?.departmentId) {
          const deptUsers = await db.user.findMany({ where: { departmentId: mgr.departmentId }, select: { id: true } });
          where.userId = { in: deptUsers.map(u => u.id) };
        }
      }
      // Admin sees ALL records — no userId filter

      if (month) where.month = month;
      if (status) where.status = status.toUpperCase();

      const records = await db.payrollRecord.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
          // Strip reviewer/approver PII for employees
          ...(user.role.toLowerCase() !== 'employee' ? {
            reviewer: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
          } : {}),
        },
      });

      // Strip bank details for employees — they don't need bankName/bankAccount
      const sanitized = user.role.toLowerCase() === 'employee'
        ? records.map(({ bankName, bankAccount, ...rest }) => rest)
        : records;

      return NextResponse.json({
        status: 'success',
        message: 'Payroll records fetched successfully',
        data: sanitized,
      });
    } catch (error) {
      console.error('Payroll GET error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch payroll records' }, { status: 500 });
    }
  });
}

/* ── POST: Generate payroll, dashboard, salary structures ──── */
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { action } = body;

      /* ── Dashboard metrics ─────────────────────── */
      if (action === 'dashboard') {
        return requireRole(request, ['admin', 'manager'], async () => {
          const allRecords = await db.payrollRecord.findMany({
            include: { user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } } },
            orderBy: { generatedAt: 'desc' },
          });

          const activeEmployees = await db.user.count({ where: { isActive: true } });
          const totalPayroll = allRecords.reduce((s, r) => s + r.netSalary, 0);
          const totalDeductions = allRecords.reduce((s, r) => s + r.deductions, 0);
          const totalBonuses = allRecords.reduce((s, r) => s + r.bonus, 0);
          const totalOvertime = allRecords.reduce((s, r) => s + r.overtime, 0);
          const totalTax = allRecords.reduce((s, r) => s + r.tax, 0);
          const avgSalary = allRecords.length > 0 ? totalPayroll / allRecords.length : 0;

          const statusCounts = {
            draft: allRecords.filter(r => r.status === 'DRAFT').length,
            reviewed: allRecords.filter(r => r.status === 'REVIEWED').length,
            approved: allRecords.filter(r => r.status === 'APPROVED').length,
            paid: allRecords.filter(r => r.status === 'PAID').length,
            onHold: allRecords.filter(r => r.status === 'ON_HOLD').length,
          };

          const pendingAmount = allRecords.filter(r => r.status !== 'PAID').reduce((s, r) => s + r.netSalary, 0);
          const paidAmount = allRecords.filter(r => r.status === 'PAID').reduce((s, r) => s + r.netSalary, 0);

          // Monthly trend
          const monthMap: Record<string, { total: number; paid: number; pending: number }> = {};
          allRecords.forEach(r => {
            if (!monthMap[r.month]) monthMap[r.month] = { total: 0, paid: 0, pending: 0 };
            monthMap[r.month].total += r.netSalary;
            if (r.status === 'PAID') monthMap[r.month].paid += r.netSalary;
            else monthMap[r.month].pending += r.netSalary;
          });
          const monthlyTrend = Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, ...data }));

          // Department breakdown
          const deptMap: Record<string, { total: number; employees: Set<string> }> = {};
          allRecords.forEach(r => {
            const dept = (r.user as any)?.department?.name || 'Unassigned';
            if (!deptMap[dept]) deptMap[dept] = { total: 0, employees: new Set() };
            deptMap[dept].total += r.netSalary;
            deptMap[dept].employees.add(r.userId);
          });
          const deptBreakdown = Object.entries(deptMap).map(([department, data]) => ({
            department, total: data.total, employees: data.employees.size,
            avgSalary: data.employees.size > 0 ? data.total / data.employees.size : 0,
          }));

          // Recent activity
          const recentActivity = allRecords.slice(0, 10).map(r => ({
            id: r.id, userId: r.userId, userName: (r.user as any)?.name || '',
            action: `Payroll ${r.status.toLowerCase()}`, month: r.month, amount: r.netSalary,
            timestamp: r.paidAt?.toISOString() || r.approvedAt?.toISOString() || r.reviewedAt?.toISOString() || r.generatedAt.toISOString(),
          }));

          // Salary structures
          const salaryStructures = await db.salaryStructure.findMany({
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } } },
            orderBy: { createdAt: 'desc' },
          });

          const normStructures = salaryStructures.map(s => ({
            id: s.id, userId: s.userId,
            userName: (s.user as any)?.name || '', userEmail: (s.user as any)?.email || '',
            userDepartment: (s.user as any)?.department?.name || '',
            baseSalary: s.baseSalary, housingAllowance: s.housingAllowance, transportAllowance: s.transportAllowance,
            medicalAllowance: s.medicalAllowance, foodAllowance: s.foodAllowance, otherAllowances: s.otherAllowances,
            overtimeRate: s.overtimeRate, taxPercentage: s.taxPercentage, insuranceRate: s.insuranceRate,
            providentFundRate: s.providentFundRate, effectiveFrom: s.effectiveFrom, effectiveTo: s.effectiveTo,
            bankName: s.bankName, bankAccount: s.bankAccount,
            paymentMethod: (s.paymentMethod || 'BANK_TRANSFER').toLowerCase().replace(/_/g, '-'),
            isActive: s.isActive, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt?.toISOString(),
          }));

          // Manager sees only their department
          let filteredRecords = allRecords;
          let filteredMetrics = {
            totalEmployees: activeEmployees, totalPayroll, totalDeductions, totalBonuses,
            totalOvertime, totalTax, avgSalary, ...statusCounts, pendingAmount, paidAmount,
          };
          if (user.role.toLowerCase() === 'manager') {
            const mgr = await db.user.findUnique({ where: { id: user.userId }, select: { departmentId: true } });
            if (mgr?.departmentId) {
              filteredRecords = allRecords.filter(r => (r.user as any)?.department?.id === mgr.departmentId);
              const fp = filteredRecords;
              filteredMetrics = {
                totalEmployees: new Set(fp.map(r => r.userId)).size,
                totalPayroll: fp.reduce((s, r) => s + r.netSalary, 0),
                totalDeductions: fp.reduce((s, r) => s + r.deductions, 0),
                totalBonuses: fp.reduce((s, r) => s + r.bonus, 0),
                totalOvertime: fp.reduce((s, r) => s + r.overtime, 0),
                totalTax: fp.reduce((s, r) => s + r.tax, 0),
                avgSalary: fp.length > 0 ? fp.reduce((s, r) => s + r.netSalary, 0) / fp.length : 0,
                draft: fp.filter(r => r.status === 'DRAFT').length,
                reviewed: fp.filter(r => r.status === 'REVIEWED').length,
                approved: fp.filter(r => r.status === 'APPROVED').length,
                paid: fp.filter(r => r.status === 'PAID').length,
                onHold: fp.filter(r => r.status === 'ON_HOLD').length,
                pendingAmount: fp.filter(r => r.status !== 'PAID').reduce((s, r) => s + r.netSalary, 0),
                paidAmount: fp.filter(r => r.status === 'PAID').reduce((s, r) => s + r.netSalary, 0),
              };
            }
          }

          return NextResponse.json({
            status: 'success',
            data: {
              metrics: filteredMetrics,
              monthlyTrend,
              deptBreakdown,
              recentActivity,
              salaryStructures: normStructures,
            },
          });
        });
      }

      /* ── Create salary structure ────────────────── */
      if (action === 'create-structure') {
        return requireRole(request, ['admin'], async () => {
          const { userId, baseSalary, housingAllowance, transportAllowance, medicalAllowance,
            foodAllowance, otherAllowances, overtimeRate, taxPercentage, insuranceRate,
            providentFundRate, effectiveFrom, effectiveTo, bankName, bankAccount, paymentMethod } = body;

          if (!userId || !baseSalary || !effectiveFrom) {
            return NextResponse.json({ status: 'error', message: 'userId, baseSalary, and effectiveFrom are required' }, { status: 400 });
          }

          // Deactivate previous structure
          await db.salaryStructure.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false, effectiveTo: effectiveFrom },
          });

          const structure = await db.salaryStructure.create({
            data: {
              userId, baseSalary,
              housingAllowance: housingAllowance ?? 0,
              transportAllowance: transportAllowance ?? 0,
              medicalAllowance: medicalAllowance ?? 0,
              foodAllowance: foodAllowance ?? 0,
              otherAllowances: otherAllowances ?? 0,
              overtimeRate: overtimeRate ?? 0,
              taxPercentage: taxPercentage ?? 0,
              insuranceRate: insuranceRate ?? 0,
              providentFundRate: providentFundRate ?? 0,
              effectiveFrom,
              effectiveTo: effectiveTo || null,
              bankName: bankName || null,
              bankAccount: bankAccount || null,
              paymentMethod: (paymentMethod || 'BANK_TRANSFER').toUpperCase().replace(/-/g, '_'),
            },
            include: { user: { select: { name: true, email: true, department: { select: { name: true } } } } },
          });

          // Also update user salary
          await db.user.update({ where: { id: userId }, data: { salary: baseSalary } });

          return NextResponse.json({ status: 'success', message: 'Salary structure created', data: structure }, { status: 201 });
        });
      }

      /* ── Update salary structure ────────────────── */
      if (action === 'update-structure') {
        return requireRole(request, ['admin'], async () => {
          const { id, ...updates } = body;
          if (!id) return NextResponse.json({ status: 'error', message: 'ID is required' }, { status: 400 });

          const data: Record<string, unknown> = { ...updates };
          if (updates.paymentMethod) data.paymentMethod = updates.paymentMethod.toUpperCase().replace(/-/g, '_');

          const structure = await db.salaryStructure.update({
            where: { id },
            data,
            include: { user: { select: { name: true, email: true, department: { select: { name: true } } } } },
          });

          if (updates.baseSalary) {
            await db.user.update({ where: { id: structure.userId }, data: { salary: updates.baseSalary } });
          }

          return NextResponse.json({ status: 'success', message: 'Salary structure updated', data: structure });
        });
      }

      /* ── Generate payroll ───────────────────────── */
      return requireRole(request, ['admin'], async () => {
        const { month, departmentId } = body;

        if (!month) {
          return NextResponse.json({ status: 'error', message: 'Month (YYYY-MM) is required' }, { status: 400 });
        }

        // Check if payroll already generated for this month
        if (departmentId) {
          // When departmentId is specified, only check for records belonging to that department's users
          const deptUsers = await db.user.findMany({ where: { departmentId }, select: { id: true } });
          const deptUserIds = deptUsers.map(u => u.id);
          const existingCount = await db.payrollRecord.count({
            where: { month, userId: { in: deptUserIds } },
          });
          if (existingCount > 0) {
            return NextResponse.json({ status: 'error', message: `Payroll already generated for ${month} in this department` }, { status: 409 });
          }
        } else {
          // No departmentId — global check across all departments
          const existingCount = await db.payrollRecord.count({ where: { month } });
          if (existingCount > 0) {
            return NextResponse.json({ status: 'error', message: `Payroll already generated for ${month}` }, { status: 409 });
          }
        }

        // Get all active employees
        const where: Record<string, unknown> = { isActive: true };
        if (departmentId) where.departmentId = departmentId;
        const employees = await db.user.findMany({
          where,
          include: { department: { select: { id: true, name: true } } },
        });

        const records: any[] = [];

        for (const emp of employees) {
          // Try to get salary structure
          const structure = await db.salaryStructure.findFirst({
            where: { userId: emp.id, isActive: true },
          });

          const baseSalary = structure?.baseSalary || emp.salary || 10000;
          const housingAllowance = structure?.housingAllowance || 0;
          const transportAllowance = structure?.transportAllowance || 0;
          const medicalAllowance = structure?.medicalAllowance || 0;
          const foodAllowance = structure?.foodAllowance || 0;
          const otherAllowances = structure?.otherAllowances || 0;
          const overtimeRate = structure?.overtimeRate || 0;
          const taxPercentage = structure?.taxPercentage || 0;
          const insuranceRate = structure?.insuranceRate || 0;
          const providentFundRate = structure?.providentFundRate || 0;

          // Calculate overtime from attendance
          const monthStart = `${month}-01`;
          const monthEnd = `${month}-31`;
          const overtimeResult = await db.attendance.aggregate({
            _sum: { overtimeHours: true },
            where: { userId: emp.id, date: { gte: monthStart, lte: monthEnd } },
          });
          const overtimeHours = overtimeResult._sum.overtimeHours || 0;
          const overtime = Math.round(overtimeHours * overtimeRate * 100) / 100;

          const totalAllowances = housingAllowance + transportAllowance + medicalAllowance + foodAllowance + otherAllowances;

          // Calculate deductions from attendance
          const absentDays = await db.attendance.count({
            where: { userId: emp.id, date: { gte: monthStart, lte: monthEnd }, status: 'ABSENT' },
          });
          const lateDays = await db.attendance.count({
            where: { userId: emp.id, date: { gte: monthStart, lte: monthEnd }, status: 'LATE' },
          });

          const dailyRate = baseSalary / 22;
          const attendanceDeduction = Math.round((absentDays * dailyRate + lateDays * dailyRate * 0.25) * 100) / 100;

          // Tax & statutory
          const tax = Math.round(baseSalary * (taxPercentage / 100) * 100) / 100;
          const insurance = Math.round(baseSalary * (insuranceRate / 100) * 100) / 100;
          const providentFund = Math.round(baseSalary * (providentFundRate / 100) * 100) / 100;

          const bonus = 0; // Manual bonus entry
          const otherDeductions = 0;
          const totalDeductions = Math.round((attendanceDeduction + tax + insurance + providentFund + otherDeductions) * 100) / 100;
          const grossSalary = Math.round((baseSalary + overtime + totalAllowances + bonus) * 100) / 100;
          const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

          const record = await db.payrollRecord.create({
            data: {
              userId: emp.id, month, baseSalary, overtime,
              allowances: totalAllowances, bonus, tax, insurance, providentFund,
              otherDeductions, deductions: totalDeductions, grossSalary, netSalary,
              status: 'DRAFT',
              paymentMethod: structure?.paymentMethod || 'BANK_TRANSFER',
              bankName: structure?.bankName || null,
              bankAccount: structure?.bankAccount || null,
            },
          });

          records.push({
            ...record,
            user: { id: emp.id, name: emp.name, email: emp.email, position: emp.position, department: emp.department },
          });
        }

        return NextResponse.json({
          status: 'success',
          message: `Payroll generated for ${month} (${records.length} employees)`,
          data: records,
        }, { status: 201 });
      });
    } catch (error) {
      console.error('Payroll POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to process payroll request' }, { status: 500 });
    }
  });
}

/* ── PATCH: Update payroll records, bulk actions ───────────── */
export async function PATCH(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, ids, action, status, month: updateMonth } = body;

      /* ── Bulk action ───────────────────────────── */
      if (ids && Array.isArray(ids) && action) {
        return requireRole(request, ['admin', 'manager'], async () => {
          const statusMap: Record<string, string> = {
            review: 'REVIEWED', approve: 'APPROVED', pay: 'PAID', hold: 'ON_HOLD', cancel: 'CANCELLED',
          };
          const newStatus = statusMap[action];
          if (!newStatus) return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });

          const updateData: Record<string, unknown> = { status: newStatus };

          if (newStatus === 'REVIEWED') {
            updateData.reviewedById = user.userId;
            updateData.reviewedAt = new Date();
          } else if (newStatus === 'APPROVED') {
            updateData.approvedById = user.userId;
            updateData.approvedAt = new Date();
          } else if (newStatus === 'PAID') {
            updateData.paidAt = new Date();
          }

          // Manager can only update records in their department
          let whereClause: Record<string, unknown> = { id: { in: ids } };
          if (user.role.toLowerCase() === 'manager') {
            const mgr = await db.user.findUnique({ where: { id: user.userId }, select: { departmentId: true } });
            if (mgr?.departmentId) {
              const deptUsers = await db.user.findMany({ where: { departmentId: mgr.departmentId }, select: { id: true } });
              whereClause = { id: { in: ids }, userId: { in: deptUsers.map(u => u.id) } };
            }
          }

          await db.payrollRecord.updateMany({ where: whereClause, data: updateData });

          return NextResponse.json({
            status: 'success',
            message: `${ids.length} record(s) updated to ${newStatus}`,
          });
        });
      }

      /* ── Bulk update by month ───────────────────── */
      if (updateMonth && !id) {
        return requireRole(request, ['admin'], async () => {
          if (!['APPROVED', 'PAID'].includes(status)) {
            return NextResponse.json({ status: 'error', message: 'Status must be APPROVED or PAID' }, { status: 400 });
          }
          const updateData: Record<string, unknown> = { status };
          if (status === 'PAID') updateData.paidAt = new Date();
          if (status === 'APPROVED') { updateData.approvedById = user.userId; updateData.approvedAt = new Date(); }

          await db.payrollRecord.updateMany({
            where: { month: updateMonth, status: status === 'PAID' ? 'APPROVED' : 'DRAFT' },
            data: updateData,
          });

          return NextResponse.json({ status: 'success', message: `All payroll records for ${updateMonth} updated to ${status}` });
        });
      }

      /* ── Edit single payroll record ─────────────── */
      if (id && action === 'edit') {
        return requireRole(request, ['admin'], async () => {
          const existing = await db.payrollRecord.findUnique({ where: { id } });
          if (!existing) return NextResponse.json({ status: 'error', message: 'Payroll record not found' }, { status: 404 });

          const { action: _action, id: _id, ...updates } = body;

          // Recalculate derived fields
          const baseSalary = (updates.baseSalary as number) ?? existing.baseSalary;
          const overtime = (updates.overtime as number) ?? existing.overtime;
          const allowances = (updates.allowances as number) ?? existing.allowances;
          const bonus = (updates.bonus as number) ?? existing.bonus;
          const tax = (updates.tax as number) ?? existing.tax;
          const insurance = (updates.insurance as number) ?? existing.insurance;
          const providentFund = (updates.providentFund as number) ?? existing.providentFund;
          const otherDeductions = (updates.otherDeductions as number) ?? existing.otherDeductions;

          const grossSalary = Math.round((baseSalary + overtime + allowances + bonus) * 100) / 100;
          const deductions = Math.round((tax + insurance + providentFund + otherDeductions) * 100) / 100;
          const netSalary = Math.round((grossSalary - deductions) * 100) / 100;

          const record = await db.payrollRecord.update({
            where: { id },
            data: { ...updates, grossSalary, deductions, netSalary },
            include: {
              user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
              reviewer: { select: { id: true, name: true } },
              approver: { select: { id: true, name: true } },
            },
          });

          return NextResponse.json({ status: 'success', message: 'Payroll record updated', data: record });
        });
      }

      /* ── Single record status update ────────────── */
      if (!id || !status) {
        return NextResponse.json({ status: 'error', message: 'Record ID and status are required' }, { status: 400 });
      }

      const validStatuses = ['DRAFT', 'REVIEWED', 'APPROVED', 'PAID', 'ON_HOLD', 'CANCELLED'];
      if (!validStatuses.includes(status.toUpperCase())) {
        return NextResponse.json({ status: 'error', message: `Status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
      }

      const existing = await db.payrollRecord.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ status: 'error', message: 'Payroll record not found' }, { status: 404 });

      // Manager can only update records in their department
      if (user.role.toLowerCase() === 'manager') {
        const emp = await db.user.findUnique({ where: { id: existing.userId }, select: { departmentId: true } });
        const mgr = await db.user.findUnique({ where: { id: user.userId }, select: { departmentId: true } });
        if (emp?.departmentId !== mgr?.departmentId) {
          return NextResponse.json({ status: 'error', message: 'Not authorized for this record' }, { status: 403 });
        }
      }

      const updateData: Record<string, unknown> = { status: status.toUpperCase() };

      if (status.toUpperCase() === 'REVIEWED') {
        updateData.reviewedById = user.userId;
        updateData.reviewedAt = new Date();
      } else if (status.toUpperCase() === 'APPROVED') {
        updateData.approvedById = user.userId;
        updateData.approvedAt = new Date();
      } else if (status.toUpperCase() === 'PAID') {
        updateData.paidAt = new Date();
      }

      const record = await db.payrollRecord.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
          reviewer: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json({ status: 'success', message: `Payroll record ${status.toLowerCase()} successfully`, data: record });
    } catch (error) {
      console.error('Payroll PATCH error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to update payroll record' }, { status: 500 });
    }
  });
}
