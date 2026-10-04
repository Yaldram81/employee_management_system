import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { emitRealtimeEvent, RealtimeEvents } from '@/lib/realtime';

// Helper: get manager's team member IDs
async function getManagerTeamUserIds(managerId: string): Promise<{ deptId: string | null; teamUserIds: string[] }> {
  const manager = await db.user.findUnique({
    where: { id: managerId },
    include: { department: { select: { id: true, name: true } } },
  });

  const deptId = manager?.departmentId || null;
  if (!deptId) return { deptId, teamUserIds: [] };

  const teamMembers = await db.user.findMany({
    where: { departmentId: deptId, isActive: true },
    select: { id: true },
  });

  return { deptId, teamUserIds: teamMembers.map(u => u.id) };
}

// Helper: verify leave belongs to a team member
async function verifyLeaveBelongsToTeam(leaveId: string, teamUserIds: string[]) {
  const leave = await db.leave.findUnique({
    where: { id: leaveId },
    include: { user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } } },
  });
  if (!leave) return { error: NextResponse.json({ status: 'error', message: 'Leave not found' }, { status: 404 }), leave: null };
  if (!teamUserIds.includes(leave.userId)) {
    return { error: NextResponse.json({ status: 'error', message: 'Leave does not belong to your team' }, { status: 403 }), leave: null };
  }
  return { error: null, leave };
}

// Helper: calculate business days between two dates
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

// POST /api/leave-manager — Manager-specific leave data and actions
export async function POST(request: NextRequest) {
  return requireRole(request, ['manager'], async (user) => {
    try {
      const body = await request.json();
      const { action } = body;
      const managerId = user.userId;

      switch (action) {
        // ─────────────────────────────────────────────────────────────
        // DASHBOARD — existing action, preserved as-is
        // ─────────────────────────────────────────────────────────────
        case 'dashboard': {
          const today = new Date().toISOString().split('T')[0];

          const manager = await db.user.findUnique({
            where: { id: managerId },
            include: { department: { select: { id: true, name: true } } },
          });

          const deptId = manager?.departmentId;

          const teamMembers = await db.user.findMany({
            where: { departmentId: deptId, isActive: true },
            include: { department: { select: { name: true } } },
          });

          const teamUserIds = teamMembers.map(u => u.id);

          const currentLeaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              status: { in: ['APPROVED', 'PENDING'] },
              startDate: { lte: today },
              endDate: { gte: today },
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
              manager: { select: { name: true } },
            },
          });

          const pendingLeaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              status: 'PENDING',
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          });

          const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
          const escalated = pendingLeaves.filter(l => new Date(l.createdAt) < twoDaysAgo);
          const recentPending = pendingLeaves.filter(l => new Date(l.createdAt) >= twoDaysAgo);

          const currentYear = new Date().getFullYear();
          const teamBalances = await db.leaveBalance.findMany({
            where: {
              userId: { in: teamUserIds },
              year: currentYear,
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
          });

          const thirtyDaysLater = new Date();
          thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
          const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];

          const upcomingLeaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              status: 'APPROVED',
              startDate: { gte: today, lte: thirtyDaysLaterStr },
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
            orderBy: { startDate: 'asc' },
          });

          const fourteenDaysLater = new Date();
          fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
          const fourteenDaysLaterStr = fourteenDaysLater.toISOString().split('T')[0];

          const upcomingTeamLeaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              status: { in: ['APPROVED', 'PENDING'] },
              startDate: { lte: fourteenDaysLaterStr },
              endDate: { gte: today },
            },
            include: {
              user: { select: { id: true, name: true } },
            },
          });

          const overlapDates: Array<{ date: string; count: number; members: string[] }> = [];
          for (let d = new Date(); d <= fourteenDaysLater; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const onLeave = upcomingTeamLeaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr);
            if (onLeave.length >= 2) {
              overlapDates.push({
                date: dateStr,
                count: onLeave.length,
                members: onLeave.map(l => l.user?.name || 'Unknown'),
              });
            }
          }

          const allTeamLeaves = await db.leave.findMany({
            where: { userId: { in: teamUserIds } },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
              manager: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          const holidays = await db.companyHoliday.findMany({ orderBy: { date: 'asc' } });
          const policies = await db.leavePolicy.findMany({ where: { isActive: true } });

          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
          const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
          const monthLeaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              status: 'APPROVED',
              startDate: { lte: monthEnd },
              endDate: { gte: monthStart },
            },
          });

          const monthlyStats = [];
          for (let i = 5; i >= 0; i--) {
            const statMonth = new Date();
            statMonth.setMonth(statMonth.getMonth() - i);
            const mStart = new Date(statMonth.getFullYear(), statMonth.getMonth(), 1).toISOString().split('T')[0];
            const mEnd = new Date(statMonth.getFullYear(), statMonth.getMonth() + 1, 0).toISOString().split('T')[0];
            const mLeaves = await db.leave.findMany({
              where: {
                userId: { in: teamUserIds },
                status: 'APPROVED',
                startDate: { lte: mEnd },
                endDate: { gte: mStart },
              },
            });
            const totalDays = mLeaves.reduce((sum, l) => {
              const start = new Date(Math.max(new Date(l.startDate).getTime(), new Date(mStart).getTime()));
              const end = new Date(Math.min(new Date(l.endDate).getTime(), new Date(mEnd).getTime()));
              return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
            }, 0);
            monthlyStats.push({
              month: statMonth.toLocaleString('default', { month: 'short' }),
              year: statMonth.getFullYear(),
              leaveDays: totalDays,
              leaveCount: mLeaves.length,
            });
          }

          const typeDistribution: Record<string, number> = {};
          allTeamLeaves.filter(l => l.status === 'APPROVED').forEach(l => {
            typeDistribution[l.type] = (typeDistribution[l.type] || 0) + 1;
          });

          const coverageRiskDays = overlapDates.filter(o => o.count >= Math.ceil(teamMembers.length * 0.3));

          return NextResponse.json({
            status: 'success',
            data: {
              departmentName: manager?.department?.name || 'N/A',
              teamSize: teamMembers.length,
              metrics: {
                onLeaveToday: currentLeaves.filter(l => l.status === 'APPROVED').length,
                pendingApprovals: pendingLeaves.length,
                escalatedCount: escalated.length,
                teamUtilization: teamMembers.length > 0
                  ? Math.round(((teamMembers.length - currentLeaves.filter(l => l.status === 'APPROVED').length) / teamMembers.length) * 100)
                  : 100,
                coverageRisk: coverageRiskDays.length,
                thisMonthLeaves: monthLeaves.length,
              },
              pendingLeaves: pendingLeaves.map(l => ({
                id: l.id,
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                userEmail: l.user?.email || '',
                department: l.user?.department?.name || 'N/A',
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
                reason: l.reason,
                status: l.status,
                createdAt: l.createdAt,
                isEscalated: new Date(l.createdAt) < twoDaysAgo,
                daysCount: Math.max(1, Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1),
              })),
              escalated,
              recentPending,
              teamBalances: teamBalances.map(b => ({
                id: b.id,
                userId: b.userId,
                userName: b.user?.name || 'Unknown',
                department: b.user?.department?.name || 'N/A',
                leaveType: b.leaveType,
                total: b.total,
                used: b.used,
                remaining: b.total - b.used,
                carriedForward: b.carriedForward,
                year: b.year,
              })),
              upcomingLeaves: upcomingLeaves.map(l => ({
                id: l.id,
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
              })),
              overlapDates,
              coverageRiskDays,
              allTeamLeaves: allTeamLeaves.map(l => ({
                id: l.id,
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                department: l.user?.department?.name || 'N/A',
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
                reason: l.reason,
                status: l.status,
                managerName: l.manager?.name || null,
                createdAt: l.createdAt,
                reviewedAt: l.reviewedAt,
              })),
              holidays,
              policies,
              monthlyStats,
              typeDistribution,
              teamMembers: teamMembers.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                department: u.department?.name || 'N/A',
              })),
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // BULK-APPROVE — existing action, preserved
        // ─────────────────────────────────────────────────────────────
        case 'bulk-approve': {
          const { leaveIds, status, comment } = body;
          if (!leaveIds || !Array.isArray(leaveIds) || !status) {
            return NextResponse.json({ status: 'error', message: 'leaveIds array and status are required' }, { status: 400 });
          }

          if (!['APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ status: 'error', message: 'Status must be APPROVED or REJECTED' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const results = [];

          for (const id of leaveIds) {
            try {
              const existing = await db.leave.findUnique({ where: { id } });
              if (existing && existing.status === 'PENDING' && teamUserIds.includes(existing.userId)) {
                const updateData: Record<string, unknown> = {
                  status,
                  managerId,
                  reviewedAt: new Date(),
                };
                if (comment) {
                  updateData.reason = existing.reason + `\n[Manager Comment]: ${comment}`;
                }
                await db.leave.update({ where: { id }, data: updateData });

                // If approved, increment leave balance used
                if (status === 'APPROVED') {
                  const days = calculateDays(existing.startDate, existing.endDate);
                  const currentYear = new Date().getFullYear();
                  const balance = await db.leaveBalance.findUnique({
                    where: { userId_leaveType_year: { userId: existing.userId, leaveType: existing.type, year: currentYear } },
                  });
                  if (balance) {
                    await db.leaveBalance.update({
                      where: { id: balance.id },
                      data: { used: balance.used + days },
                    });
                  }
                }

                // Create notification for employee
                const notification = await db.notification.create({
                  data: {
                    userId: existing.userId,
                    type: 'LEAVE_UPDATE',
                    title: `Leave ${status.toLowerCase()}`,
                    message: `Your ${existing.type.toLowerCase()} leave request (${existing.startDate} to ${existing.endDate}) has been ${status.toLowerCase()}${comment ? `: ${comment}` : ''}`,
                  },
                });
                // Push real-time notification
                emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
                  id: notification.id, userId: existing.userId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
                }).catch(() => {});
                emitRealtimeEvent(existing.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, { leaveId: id, status, comment }).catch(() => {});

                results.push({ id, success: true });
              } else {
                results.push({ id, success: false, reason: existing ? 'Not pending or not in your team' : 'Not found' });
              }
            } catch {
              results.push({ id, success: false, reason: 'Error updating' });
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `${results.filter(r => r.success).length} leaves ${status.toLowerCase()}`,
            data: results,
          });
        }

        // ─────────────────────────────────────────────────────────────
        // APPROVE — Single leave approval with mandatory comment
        // ─────────────────────────────────────────────────────────────
        case 'approve': {
          const { leaveId, comment } = body;
          if (!leaveId || !comment) {
            return NextResponse.json({ status: 'error', message: 'leaveId and comment are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          if (leave.status !== 'PENDING') {
            return NextResponse.json({ status: 'error', message: 'Only pending leaves can be approved' }, { status: 400 });
          }

          const days = calculateDays(leave.startDate, leave.endDate);

          // Update leave
          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              status: 'APPROVED',
              managerId,
              reviewedAt: new Date(),
              reason: leave.reason + `\n[Manager Approval Comment]: ${comment}`,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
              manager: { select: { id: true, name: true } },
            },
          });

          // Update leave balance: increment used
          const currentYear = new Date().getFullYear();
          const balance = await db.leaveBalance.findUnique({
            where: { userId_leaveType_year: { userId: leave.userId, leaveType: leave.type, year: currentYear } },
          });
          if (balance) {
            await db.leaveBalance.update({
              where: { id: balance.id },
              data: { used: balance.used + days },
            });
          }

          // Create notification
          const approveNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Approved',
              message: `Your ${leave.type.toLowerCase()} leave (${leave.startDate} to ${leave.endDate}, ${days} day(s)) has been approved. Comment: ${comment}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: approveNotif.id, userId: leave.userId, title: approveNotif.title, message: approveNotif.message, type: approveNotif.type, createdAt: approveNotif.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(leave.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, { leaveId, status: 'APPROVED', comment }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Leave approved successfully',
            data: { leave: updated, daysApproved: days },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // REJECT — Single leave rejection with mandatory comment
        // ─────────────────────────────────────────────────────────────
        case 'reject': {
          const { leaveId, comment } = body;
          if (!leaveId || !comment) {
            return NextResponse.json({ status: 'error', message: 'leaveId and comment are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          if (leave.status !== 'PENDING') {
            return NextResponse.json({ status: 'error', message: 'Only pending leaves can be rejected' }, { status: 400 });
          }

          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              status: 'REJECTED',
              managerId,
              reviewedAt: new Date(),
              reason: leave.reason + `\n[Manager Rejection Comment]: ${comment}`,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
              manager: { select: { id: true, name: true } },
            },
          });

          // Create notification
          const rejectNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Rejected',
              message: `Your ${leave.type.toLowerCase()} leave (${leave.startDate} to ${leave.endDate}) has been rejected. Reason: ${comment}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: rejectNotif.id, userId: leave.userId, title: rejectNotif.title, message: rejectNotif.message, type: rejectNotif.type, createdAt: rejectNotif.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(leave.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, { leaveId, status: 'REJECTED', comment }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Leave rejected successfully',
            data: { leave: updated },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // DELEGATE — Delegate approval to another manager
        // ─────────────────────────────────────────────────────────────
        case 'delegate': {
          const { leaveId, delegateToManagerId, comment } = body;
          if (!leaveId || !delegateToManagerId || !comment) {
            return NextResponse.json({ status: 'error', message: 'leaveId, delegateToManagerId, and comment are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          if (leave.status !== 'PENDING') {
            return NextResponse.json({ status: 'error', message: 'Only pending leaves can be delegated' }, { status: 400 });
          }

          // Verify delegate is a manager
          const delegateManager = await db.user.findUnique({
            where: { id: delegateToManagerId },
          });
          if (!delegateManager || delegateManager.role !== 'MANAGER') {
            return NextResponse.json({ status: 'error', message: 'Delegate must be an active manager' }, { status: 400 });
          }

          // Update leave with delegation info in reason
          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              managerId: delegateToManagerId,
              reason: leave.reason + `\n[Delegated by Manager ${managerId} to ${delegateToManagerId}]: ${comment}`,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
              manager: { select: { id: true, name: true } },
            },
          });

          // Notify delegate manager
          const delegateNotif = await db.notification.create({
            data: {
              userId: delegateToManagerId,
              type: 'APPROVAL_REQUIRED',
              title: 'Delegated Leave Approval',
              message: `Leave request from ${leave.user?.name || 'employee'} (${leave.startDate} to ${leave.endDate}) has been delegated to you by another manager. Comment: ${comment}`,
              actionUrl: '/leaves',
            },
          });
          // Push real-time notification to delegate
          emitRealtimeEvent(delegateToManagerId, RealtimeEvents.NOTIFICATION_NEW, {
            id: delegateNotif.id, userId: delegateToManagerId, title: delegateNotif.title, message: delegateNotif.message, type: delegateNotif.type, createdAt: delegateNotif.createdAt,
          }).catch(() => {});

          // Notify employee
          const empDelegNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Request Delegated',
              message: `Your ${leave.type.toLowerCase()} leave request has been delegated to another manager for review. Comment: ${comment}`,
            },
          });
          // Push real-time notification to employee
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: empDelegNotif.id, userId: leave.userId, title: empDelegNotif.title, message: empDelegNotif.message, type: empDelegNotif.type, createdAt: empDelegNotif.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Leave approval delegated successfully',
            data: { leave: updated, delegatedTo: delegateManager.name },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // CANCEL-LEAVE — Cancel an approved leave for a team member
        // ─────────────────────────────────────────────────────────────
        case 'cancel-leave': {
          const { leaveId, reason } = body;
          if (!leaveId || !reason) {
            return NextResponse.json({ status: 'error', message: 'leaveId and reason are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          if (leave.status !== 'APPROVED') {
            return NextResponse.json({ status: 'error', message: 'Only approved leaves can be cancelled' }, { status: 400 });
          }

          const days = calculateDays(leave.startDate, leave.endDate);

          // Update leave status
          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              status: 'CANCELLED',
              reason: leave.reason + `\n[Manager Cancellation]: ${reason}`,
              managerId,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
              manager: { select: { id: true, name: true } },
            },
          });

          // Restore leave balance: decrement used
          const currentYear = new Date().getFullYear();
          const balance = await db.leaveBalance.findUnique({
            where: { userId_leaveType_year: { userId: leave.userId, leaveType: leave.type, year: currentYear } },
          });
          if (balance) {
            await db.leaveBalance.update({
              where: { id: balance.id },
              data: { used: Math.max(0, balance.used - days) },
            });
          }

          // Create notification
          const cancelNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Cancelled by Manager',
              message: `Your approved ${leave.type.toLowerCase()} leave (${leave.startDate} to ${leave.endDate}) has been cancelled by your manager. Reason: ${reason}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: cancelNotif.id, userId: leave.userId, title: cancelNotif.title, message: cancelNotif.message, type: cancelNotif.type, createdAt: cancelNotif.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(leave.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, { leaveId, status: 'CANCELLED', comment: reason }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Leave cancelled successfully',
            data: { leave: updated, daysRestored: days },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // MODIFY-LEAVE — Modify dates/type of a pending leave request
        // ─────────────────────────────────────────────────────────────
        case 'modify-leave': {
          const { leaveId, startDate, endDate, type, reason: modifyReason, managerReason } = body;
          if (!leaveId) {
            return NextResponse.json({ status: 'error', message: 'leaveId is required' }, { status: 400 });
          }
          if (!managerReason) {
            return NextResponse.json({ status: 'error', message: 'managerReason is required for modifications' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          if (leave.status !== 'PENDING') {
            return NextResponse.json({ status: 'error', message: 'Only pending leaves can be modified' }, { status: 400 });
          }

          const updateData: Record<string, unknown> = {};
          const changes: string[] = [];

          if (startDate && startDate !== leave.startDate) {
            updateData.startDate = startDate;
            changes.push(`start date: ${leave.startDate} → ${startDate}`);
          }
          if (endDate && endDate !== leave.endDate) {
            updateData.endDate = endDate;
            changes.push(`end date: ${leave.endDate} → ${endDate}`);
          }
          if (type && type !== leave.type) {
            updateData.type = type;
            changes.push(`type: ${leave.type} → ${type}`);
          }
          if (modifyReason && modifyReason !== leave.reason) {
            updateData.reason = modifyReason;
            changes.push('reason updated');
          }

          if (changes.length === 0) {
            return NextResponse.json({ status: 'error', message: 'No changes provided' }, { status: 400 });
          }

          // Add manager modification note to reason
          const currentReason = modifyReason || leave.reason;
          updateData.reason = currentReason + `\n[Manager Modified]: ${changes.join(', ')}. Reason: ${managerReason}`;

          const updated = await db.leave.update({
            where: { id: leaveId },
            data: updateData,
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
              manager: { select: { id: true, name: true } },
            },
          });

          // Notify employee
          const modifyNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Request Modified',
              message: `Your leave request has been modified by your manager. Changes: ${changes.join(', ')}. Reason: ${managerReason}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: modifyNotif.id, userId: leave.userId, title: modifyNotif.title, message: modifyNotif.message, type: modifyNotif.type, createdAt: modifyNotif.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Leave modified successfully',
            data: { leave: updated, changes },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // ADD-COMMENT — Add a comment/note to a leave request
        // ─────────────────────────────────────────────────────────────
        case 'add-comment': {
          const { leaveId, comment } = body;
          if (!leaveId || !comment) {
            return NextResponse.json({ status: 'error', message: 'leaveId and comment are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          // Append comment to reason field
          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              reason: leave.reason + `\n[Manager Note]: ${comment}`,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
            },
          });

          // Notify employee
          const addCommentNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Comment Added to Leave Request',
              message: `Your manager added a note to your ${leave.type.toLowerCase()} leave request: "${comment}"`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: addCommentNotif.id, userId: leave.userId, title: addCommentNotif.title, message: addCommentNotif.message, type: addCommentNotif.type, createdAt: addCommentNotif.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Comment added successfully',
            data: { leave: updated },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // REQUEST-DOCUMENT — Request document upload for a leave
        // ─────────────────────────────────────────────────────────────
        case 'request-document': {
          const { leaveId, message } = body;
          if (!leaveId || !message) {
            return NextResponse.json({ status: 'error', message: 'leaveId and message are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          // Update leave with document request note
          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              reason: leave.reason + `\n[Document Request]: ${message}`,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
            },
          });

          // Notify employee about document request
          const docNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Document Required for Leave',
              message: `Your manager has requested a document for your ${leave.type.toLowerCase()} leave (${leave.startDate} to ${leave.endDate}): "${message}"`,
              actionUrl: '/leaves',
            },
          });
          // Push real-time notification
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: docNotif.id, userId: leave.userId, title: docNotif.title, message: docNotif.message, type: docNotif.type, createdAt: docNotif.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Document request sent successfully',
            data: { leave: updated },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // RETURN-TO-WORK — Mark return-to-work clearance
        // ─────────────────────────────────────────────────────────────
        case 'return-to-work': {
          const { leaveId, notes } = body;
          if (!leaveId || !notes) {
            return NextResponse.json({ status: 'error', message: 'leaveId and notes are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          const { error, leave } = await verifyLeaveBelongsToTeam(leaveId, teamUserIds);
          if (error) return error;

          if (leave.status !== 'APPROVED') {
            return NextResponse.json({ status: 'error', message: 'Return-to-work can only be marked for approved leaves' }, { status: 400 });
          }

          // Check if today is on or after the leave end date
          const today = new Date().toISOString().split('T')[0];
          if (today < leave.endDate) {
            return NextResponse.json({ status: 'error', message: 'Return-to-work can only be marked on or after the leave end date' }, { status: 400 });
          }

          // Update leave with return-to-work clearance
          const updated = await db.leave.update({
            where: { id: leaveId },
            data: {
              reason: leave.reason + `\n[Return-to-Work Clearance]: ${notes} (Cleared on: ${today})`,
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
            },
          });

          // Notify employee
          const rtwNotif = await db.notification.create({
            data: {
              userId: leave.userId,
              type: 'LEAVE_UPDATE',
              title: 'Return-to-Work Cleared',
              message: `Your return-to-work for ${leave.type.toLowerCase()} leave has been cleared by your manager. Notes: "${notes}"`,
            },
          });
          // Push real-time notification to employee
          emitRealtimeEvent(leave.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: rtwNotif.id, userId: leave.userId, title: rtwNotif.title, message: rtwNotif.message, type: rtwNotif.type, createdAt: rtwNotif.createdAt,
          }).catch(() => {});

          // Notify HR/Admin (optional: notify admins)
          const admins = await db.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          });
          for (const admin of admins) {
            const adminNotif = await db.notification.create({
              data: {
                userId: admin.id,
                type: 'LEAVE_UPDATE',
                title: 'Return-to-Work Cleared',
                message: `${leave.user?.name || 'Employee'} has been cleared for return-to-work by their manager. Notes: "${notes}"`,
              },
            });
            // Push real-time notification to admin
            emitRealtimeEvent(admin.id, RealtimeEvents.NOTIFICATION_NEW, {
              id: adminNotif.id, userId: admin.id, title: adminNotif.title, message: adminNotif.message, type: adminNotif.type, createdAt: adminNotif.createdAt,
            }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Return-to-work clearance marked successfully',
            data: { leave: updated, clearanceDate: today },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // CARRY-FORWARD — Approve carry-forward of unused leaves
        // ─────────────────────────────────────────────────────────────
        case 'carry-forward': {
          const { userId: targetUserId, leaveType, days, comment } = body;
          if (!targetUserId || !leaveType || !days || !comment) {
            return NextResponse.json({ status: 'error', message: 'userId, leaveType, days, and comment are required' }, { status: 400 });
          }

          if (days <= 0) {
            return NextResponse.json({ status: 'error', message: 'Days must be a positive number' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          if (!teamUserIds.includes(targetUserId)) {
            return NextResponse.json({ status: 'error', message: 'Employee is not in your team' }, { status: 403 });
          }

          // Verify the leave type policy allows carry forward
          const policy = await db.leavePolicy.findUnique({ where: { type: leaveType } });
          if (!policy || !policy.carriesForward) {
            return NextResponse.json({ status: 'error', message: `Leave type ${leaveType} does not allow carry forward` }, { status: 400 });
          }

          if (days > policy.maxCarryForward) {
            return NextResponse.json({ status: 'error', message: `Maximum carry-forward for ${leaveType} is ${policy.maxCarryForward} days` }, { status: 400 });
          }

          // Check current year's remaining balance
          const currentYear = new Date().getFullYear();
          const nextYear = currentYear + 1;
          const currentBalance = await db.leaveBalance.findUnique({
            where: { userId_leaveType_year: { userId: targetUserId, leaveType, year: currentYear } },
          });

          if (!currentBalance) {
            return NextResponse.json({ status: 'error', message: 'No leave balance found for this type' }, { status: 404 });
          }

          const remaining = currentBalance.total - currentBalance.used;
          if (days > remaining) {
            return NextResponse.json({ status: 'error', message: `Only ${remaining} days remaining, cannot carry forward ${days} days` }, { status: 400 });
          }

          // Create or update next year's balance with carry forward
          const nextBalance = await db.leaveBalance.upsert({
            where: { userId_leaveType_year: { userId: targetUserId, leaveType, year: nextYear } },
            update: {
              carriedForward: { increment: days },
              total: { increment: days },
            },
            create: {
              userId: targetUserId,
              leaveType,
              total: days,
              used: 0,
              carriedForward: days,
              year: nextYear,
            },
          });

          // Notify employee
          const cfNotif = await db.notification.create({
            data: {
              userId: targetUserId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Carry-Forward Approved',
              message: `${days} day(s) of ${leaveType.toLowerCase()} leave have been carried forward to ${nextYear}. Comment: ${comment}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(targetUserId, RealtimeEvents.NOTIFICATION_NEW, {
            id: cfNotif.id, userId: targetUserId, title: cfNotif.title, message: cfNotif.message, type: cfNotif.type, createdAt: cfNotif.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(targetUserId, RealtimeEvents.LEAVE_STATUS_CHANGED, { leaveId: null, status: 'CARRY_FORWARD', comment }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Carry-forward approved successfully',
            data: {
              nextYearBalance: {
                id: nextBalance.id,
                leaveType,
                total: nextBalance.total,
                used: nextBalance.used,
                carriedForward: nextBalance.carriedForward,
                year: nextYear,
              },
              daysCarriedForward: days,
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // ENCASH — Process leave encashment (pay out unused leaves)
        // ─────────────────────────────────────────────────────────────
        case 'encash': {
          const { userId: targetUserId, leaveType, days, comment } = body;
          if (!targetUserId || !leaveType || !days || !comment) {
            return NextResponse.json({ status: 'error', message: 'userId, leaveType, days, and comment are required' }, { status: 400 });
          }

          if (days <= 0) {
            return NextResponse.json({ status: 'error', message: 'Days must be a positive number' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          if (!teamUserIds.includes(targetUserId)) {
            return NextResponse.json({ status: 'error', message: 'Employee is not in your team' }, { status: 403 });
          }

          // Verify the leave type policy allows encashment
          const policy = await db.leavePolicy.findUnique({ where: { type: leaveType } });
          if (!policy || !policy.isEncashable) {
            return NextResponse.json({ status: 'error', message: `Leave type ${leaveType} is not encashable` }, { status: 400 });
          }

          // Check current year's remaining balance
          const currentYear = new Date().getFullYear();
          const currentBalance = await db.leaveBalance.findUnique({
            where: { userId_leaveType_year: { userId: targetUserId, leaveType, year: currentYear } },
          });

          if (!currentBalance) {
            return NextResponse.json({ status: 'error', message: 'No leave balance found for this type' }, { status: 404 });
          }

          const remaining = currentBalance.total - currentBalance.used;
          if (days > remaining) {
            return NextResponse.json({ status: 'error', message: `Only ${remaining} days remaining, cannot encash ${days} days` }, { status: 400 });
          }

          // Update balance: increment used to reflect encashed days
          const updatedBalance = await db.leaveBalance.update({
            where: { id: currentBalance.id },
            data: { used: currentBalance.used + days },
          });

          // Get employee's salary for encashment calculation
          const employee = await db.user.findUnique({
            where: { id: targetUserId },
            include: { salaryStructure: true },
          });

          const dailyRate = employee?.salary
            ? Math.round((employee.salary / 260) * 100) / 100 // ~260 working days/year
            : 0;
          const encashmentAmount = Math.round(dailyRate * days * 100) / 100;

          // Notify employee
          const encashNotif = await db.notification.create({
            data: {
              userId: targetUserId,
              type: 'LEAVE_UPDATE',
              title: 'Leave Encashment Processed',
              message: `${days} day(s) of ${leaveType.toLowerCase()} leave have been encashed. Amount: $${encashmentAmount}. Comment: ${comment}`,
            },
          });
          // Push real-time notification to employee
          emitRealtimeEvent(targetUserId, RealtimeEvents.NOTIFICATION_NEW, {
            id: encashNotif.id, userId: targetUserId, title: encashNotif.title, message: encashNotif.message, type: encashNotif.type, createdAt: encashNotif.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(targetUserId, RealtimeEvents.LEAVE_STATUS_CHANGED, { leaveId: null, status: 'ENCASHED', comment }).catch(() => {});

          // Notify admin/payroll
          const admins = await db.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          });
          for (const admin of admins) {
            const adminNotif = await db.notification.create({
              data: {
                userId: admin.id,
                type: 'LEAVE_UPDATE',
                title: 'Leave Encashment Request',
                message: `${employee?.name || 'Employee'} has ${days} day(s) of ${leaveType.toLowerCase()} leave encashed by manager. Amount: $${encashmentAmount}. Comment: ${comment}`,
              },
            });
            // Push real-time notification to admin
            emitRealtimeEvent(admin.id, RealtimeEvents.NOTIFICATION_NEW, {
              id: adminNotif.id, userId: admin.id, title: adminNotif.title, message: adminNotif.message, type: adminNotif.type, createdAt: adminNotif.createdAt,
            }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Leave encashment processed successfully',
            data: {
              daysEncashed: days,
              dailyRate,
              encashmentAmount,
              remainingBalance: updatedBalance.total - updatedBalance.used,
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // TEAM-AVAILABILITY — Get team availability for a date range
        // ─────────────────────────────────────────────────────────────
        case 'team-availability': {
          const { startDate, endDate } = body;
          if (!startDate || !endDate) {
            return NextResponse.json({ status: 'error', message: 'startDate and endDate are required' }, { status: 400 });
          }

          const { deptId, teamUserIds } = await getManagerTeamUserIds(managerId);
          if (teamUserIds.length === 0) {
            return NextResponse.json({ status: 'error', message: 'No team members found' }, { status: 404 });
          }

          // Get team members
          const teamMembers = await db.user.findMany({
            where: { id: { in: teamUserIds }, isActive: true },
            include: { department: { select: { name: true } } },
          });

          // Get approved/pending leaves overlapping the date range
          const overlappingLeaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              status: { in: ['APPROVED', 'PENDING'] },
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
          });

          // Build date range
          const dates: string[] = [];
          const current = new Date(startDate);
          const end = new Date(endDate);
          while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }

          // Build availability map
          const members = teamMembers.map(member => {
            const memberLeaves = overlappingLeaves.filter(l => l.userId === member.id);
            const availability = dates.map(date => {
              const leavesOnDate = memberLeaves.filter(l => l.startDate <= date && l.endDate >= date);
              if (leavesOnDate.length === 0) {
                return { date, status: 'available' as const };
              }
              // Check if it's a partial day (half-day scenario - just mark as partial if multiple leaves)
              if (leavesOnDate.some(l => l.status === 'PENDING')) {
                return { date, status: 'partial' as const };
              }
              return { date, status: 'on-leave' as const };
            });

            return {
              id: member.id,
              name: member.name,
              department: member.department?.name || 'N/A',
              availability,
            };
          });

          return NextResponse.json({
            status: 'success',
            data: {
              dateRange: { start: startDate, end: endDate },
              members,
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // LEAVE-REPORT — Generate leave report data for the team
        // ─────────────────────────────────────────────────────────────
        case 'leave-report': {
          const { startDate, endDate } = body;
          if (!startDate || !endDate) {
            return NextResponse.json({ status: 'error', message: 'startDate and endDate are required' }, { status: 400 });
          }

          const { teamUserIds } = await getManagerTeamUserIds(managerId);
          if (teamUserIds.length === 0) {
            return NextResponse.json({ status: 'error', message: 'No team members found' }, { status: 404 });
          }

          // Get all leaves overlapping the date range
          const leaves = await db.leave.findMany({
            where: {
              userId: { in: teamUserIds },
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            include: {
              user: { select: { id: true, name: true } },
            },
          });

          // Calculate totals
          let totalDays = 0;
          const byType: Record<string, number> = {};
          const byStatus: Record<string, number> = {};
          const memberMap: Record<string, { userName: string; totalDays: number; byType: Record<string, number> }> = {};

          for (const leave of leaves) {
            const effectiveStart = leave.startDate < startDate ? startDate : leave.startDate;
            const effectiveEnd = leave.endDate > endDate ? endDate : leave.endDate;
            const days = calculateDays(effectiveStart, effectiveEnd);

            totalDays += days;
            byType[leave.type] = (byType[leave.type] || 0) + days;
            byStatus[leave.status] = (byStatus[leave.status] || 0) + 1;

            if (!memberMap[leave.userId]) {
              memberMap[leave.userId] = {
                userName: leave.user?.name || 'Unknown',
                totalDays: 0,
                byType: {},
              };
            }
            memberMap[leave.userId].totalDays += days;
            memberMap[leave.userId].byType[leave.type] = (memberMap[leave.userId].byType[leave.type] || 0) + days;
          }

          const memberBreakdown = Object.entries(memberMap).map(([userId, data]) => ({
            userId,
            userName: data.userName,
            totalDays: data.totalDays,
            byType: data.byType,
          }));

          const avgDaysPerMember = teamUserIds.length > 0
            ? Math.round((totalDays / teamUserIds.length) * 100) / 100
            : 0;

          return NextResponse.json({
            status: 'success',
            data: {
              period: { start: startDate, end: endDate },
              summary: {
                totalLeaves: leaves.length,
                totalDays,
                avgDaysPerMember,
                byType,
                byStatus,
              },
              memberBreakdown,
            },
          });
        }

        default:
          return NextResponse.json({ status: 'error', message: `Unknown action: ${action}` }, { status: 400 });
      }
    } catch (error) {
      console.error('Leave Manager POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to process manager leave action' }, { status: 500 });
    }
  });
}
