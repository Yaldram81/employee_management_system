import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const departmentId = searchParams.get('departmentId');

      // ─── Overview Counts ──────────────────────────────────────
      const [
        totalUsers,
        totalDepartments,
        totalTasks,
        totalLeaves,
        totalRequests,
        totalComplaints,
      ] = await Promise.all([
        db.user.count({ where: { isActive: true } }),
        db.department.count(),
        db.task.count(),
        db.leave.count(),
        db.request.count(),
        db.complaint.count(),
      ]);

      // ─── Attendance Stats ─────────────────────────────────────
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const attendanceRecords = await db.attendance.findMany({
        where: {
          date: { gte: thirtyDaysAgo, lte: today },
          ...(departmentId ? { user: { departmentId } } : {}),
        },
      });

      const attendanceByStatus: Record<string, number> = {};
      for (const record of attendanceRecords) {
        attendanceByStatus[record.status] = (attendanceByStatus[record.status] || 0) + 1;
      }

      const totalAttendanceRecords = attendanceRecords.length;
      const presentCount = attendanceByStatus['PRESENT'] || 0;
      const lateCount = attendanceByStatus['LATE'] || 0;
      const absentCount = attendanceByStatus['ABSENT'] || 0;
      const halfDayCount = attendanceByStatus['HALF_DAY'] || 0;

      const attendanceRate = totalAttendanceRecords > 0
        ? Math.round(((presentCount + lateCount + halfDayCount) / totalAttendanceRecords) * 100)
        : 0;

      const lateRate = totalAttendanceRecords > 0
        ? Math.round((lateCount / totalAttendanceRecords) * 100)
        : 0;

      // ─── Today's Attendance ───────────────────────────────────
      const todayAttendance = await db.attendance.findMany({
        where: {
          date: today,
          ...(departmentId ? { user: { departmentId } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, department: { select: { name: true } } } },
        },
      });

      const todayPresent = todayAttendance.filter(a => a.status === 'PRESENT').length;
      const todayLate = todayAttendance.filter(a => a.status === 'LATE').length;
      const todayAbsent = todayAttendance.filter(a => a.status === 'ABSENT').length;

      // ─── Task Stats ───────────────────────────────────────────
      const taskWhere = departmentId ? { departmentId } : {};
      const tasks = await db.task.findMany({
        where: taskWhere,
      });

      const tasksByStatus: Record<string, number> = {};
      const tasksByPriority: Record<string, number> = {};
      for (const task of tasks) {
        tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;
        tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
      }

      const taskCompletionRate = tasks.length > 0
        ? Math.round(((tasksByStatus['DONE'] || 0) / tasks.length) * 100)
        : 0;

      // ─── Leave Stats ──────────────────────────────────────────
      const leaves = await db.leave.findMany({
        where: departmentId ? { user: { departmentId } } : {},
      });

      const leavesByStatus: Record<string, number> = {};
      const leavesByType: Record<string, number> = {};
      for (const leave of leaves) {
        leavesByStatus[leave.status] = (leavesByStatus[leave.status] || 0) + 1;
        leavesByType[leave.type] = (leavesByType[leave.type] || 0) + 1;
      }

      // ─── Department Stats ─────────────────────────────────────
      const departments = await db.department.findMany({
        include: {
          _count: { select: { users: true, tasks: true } },
          manager: { select: { name: true } },
        },
      });

      const departmentStats = await Promise.all(
        departments.map(async (dept) => {
          const deptAttendance = await db.attendance.count({
            where: {
              user: { departmentId: dept.id },
              date: { gte: thirtyDaysAgo, lte: today },
              status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
            },
          });

          const deptTotalAttendance = await db.attendance.count({
            where: {
              user: { departmentId: dept.id },
              date: { gte: thirtyDaysAgo, lte: today },
            },
          });

          return {
            id: dept.id,
            name: dept.name,
            manager: dept.manager?.name || 'Unassigned',
            memberCount: dept._count.users,
            taskCount: dept._count.tasks,
            attendanceRate: deptTotalAttendance > 0
              ? Math.round((deptAttendance / deptTotalAttendance) * 100)
              : 0,
          };
        })
      );

      // ─── Payroll Summary ──────────────────────────────────────
      const currentMonth = today.slice(0, 7);
      const payrollRecords = await db.payrollRecord.findMany({
        where: { month: currentMonth },
      });

      const totalBaseSalary = payrollRecords.reduce((sum, p) => sum + p.baseSalary, 0);
      const totalDeductions = payrollRecords.reduce((sum, p) => sum + p.deductions, 0);
      const totalBonus = payrollRecords.reduce((sum, p) => sum + p.bonus, 0);
      const totalNetSalary = payrollRecords.reduce((sum, p) => sum + p.netSalary, 0);
      const paidCount = payrollRecords.filter(p => p.status === 'PAID').length;
      const draftCount = payrollRecords.filter(p => p.status === 'DRAFT').length;

      // ─── Request Stats ────────────────────────────────────────
      const requests = await db.request.findMany({
        where: departmentId ? { user: { departmentId } } : {},
      });

      const requestsByStatus: Record<string, number> = {};
      const requestsByType: Record<string, number> = {};
      for (const req of requests) {
        requestsByStatus[req.status] = (requestsByStatus[req.status] || 0) + 1;
        requestsByType[req.type] = (requestsByType[req.type] || 0) + 1;
      }

      // ─── Complaint Stats ──────────────────────────────────────
      const complaints = await db.complaint.findMany({
        where: departmentId ? { user: { departmentId } } : {},
      });

      const complaintsByStatus: Record<string, number> = {};
      for (const complaint of complaints) {
        complaintsByStatus[complaint.status] = (complaintsByStatus[complaint.status] || 0) + 1;
      }

      // ─── Weekly Attendance Trend ──────────────────────────────
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayRecords = await db.attendance.findMany({
          where: {
            date: dateStr,
            ...(departmentId ? { user: { departmentId } } : {}),
          },
        });
        weeklyTrend.push({
          date: dateStr,
          present: dayRecords.filter(a => a.status === 'PRESENT').length,
          late: dayRecords.filter(a => a.status === 'LATE').length,
          absent: dayRecords.filter(a => a.status === 'ABSENT').length,
        });
      }

      return NextResponse.json({
        status: 'success',
        message: 'Analytics fetched successfully',
        data: {
          overview: {
            totalUsers,
            totalDepartments,
            totalTasks,
            totalLeaves,
            totalRequests,
            totalComplaints,
          },
          attendance: {
            rate: attendanceRate,
            lateRate,
            today: { present: todayPresent, late: todayLate, absent: todayAbsent },
            byStatus: attendanceByStatus,
            weeklyTrend,
            total: totalAttendanceRecords,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            halfDay: halfDayCount,
          },
          tasks: {
            total: totalTasks,
            byStatus: tasksByStatus,
            byPriority: tasksByPriority,
            completionRate: taskCompletionRate,
          },
          leaves: {
            total: totalLeaves,
            byStatus: leavesByStatus,
            byType: leavesByType,
          },
          requests: {
            total: totalRequests,
            byStatus: requestsByStatus,
            byType: requestsByType,
          },
          complaints: {
            total: totalComplaints,
            byStatus: complaintsByStatus,
          },
          departments: departmentStats,
          payroll: {
            month: currentMonth,
            totalBaseSalary,
            totalDeductions,
            totalBonus,
            totalNetSalary,
            paidCount,
            draftCount,
          },
        },
      });
    } catch (error) {
      console.error('Analytics GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }
  });
}
