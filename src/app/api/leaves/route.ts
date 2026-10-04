import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { emitRealtimeEvent, RealtimeEvents } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      let userId = searchParams.get('userId');
      const status = searchParams.get('status');
      let departmentId = searchParams.get('departmentId');
      const type = searchParams.get('type');

      // Employees can only see their own leaves
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      // Managers auto-scope to their department's leaves
      if (user.role.toLowerCase() === 'manager' && !departmentId && !userId) {
        const mgr = await db.user.findUnique({
          where: { id: user.userId },
          select: { departmentId: true },
        });
        if (mgr?.departmentId) {
          departmentId = mgr.departmentId;
        }
      }

      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;
      if (status) where.status = status;
      if (type) where.type = type;

      if (departmentId) {
        where.user = { departmentId };
      }

      const leaves = await db.leave.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
          manager: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Leaves fetched successfully',
        data: leaves,
      });
    } catch (error) {
      console.error('Leaves GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch leaves' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      let { userId, type, startDate, endDate, reason } = body;

      // Employees can only apply leaves for themselves
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      if (!userId || !type || !startDate || !endDate || !reason) {
        return NextResponse.json(
          { status: 'error', message: 'All fields are required: userId, type, startDate, endDate, reason' },
          { status: 400 }
        );
      }

      const userRecord = await db.user.findUnique({ where: { id: userId } });
      if (!userRecord) {
        return NextResponse.json(
          { status: 'error', message: 'User not found' },
          { status: 404 }
        );
      }

      const leave = await db.leave.create({
        data: {
          userId,
          type,
          startDate,
          endDate,
          reason,
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
        },
      });

      // Notify the employee's manager about the new leave application
      try {
        if (userRecord.departmentId) {
          const dept = await db.department.findUnique({ where: { id: userRecord.departmentId }, include: { manager: true } });
          if (dept?.managerId) {
            await db.notification.create({
              data: {
                userId: dept.managerId,
                type: 'LEAVE_UPDATE',
                title: 'New Leave Application',
                message: `${userRecord.name} applied for ${type.toLowerCase()} leave (${startDate} to ${endDate})`,
              },
            });
            emitRealtimeEvent(dept.managerId, RealtimeEvents.NOTIFICATION_NEW, {
              title: 'New Leave Application',
              message: `${userRecord.name} applied for ${type.toLowerCase()} leave`,
              type: 'LEAVE_UPDATE',
              createdAt: new Date().toISOString(),
            }).catch(() => {});
            emitRealtimeEvent(dept.managerId, RealtimeEvents.LEAVE_APPLIED, {
              leaveId: leave.id,
              userId,
              type,
              startDate,
              endDate,
            }).catch(() => {});
          }
        }
      } catch (notifErr) {
        console.warn('Failed to send leave notification:', notifErr);
      }

      return NextResponse.json(
        {
          status: 'success',
          message: 'Leave application submitted successfully',
          data: leave,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Leaves POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to submit leave application' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (user) => {
    try {
      const body = await request.json();
      const { id, status } = body;

      // Use authenticated user's ID as managerId
      const managerId = user.userId;

      if (!id || !status) {
        return NextResponse.json(
          { status: 'error', message: 'Leave ID and status are required' },
          { status: 400 }
        );
      }

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json(
          { status: 'error', message: 'Status must be APPROVED or REJECTED' },
          { status: 400 }
        );
      }

      const existing = await db.leave.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Leave not found' },
          { status: 404 }
        );
      }

      if (existing.status !== 'PENDING') {
        return NextResponse.json(
          { status: 'error', message: 'Only pending leaves can be approved or rejected' },
          { status: 400 }
        );
      }

      const leave = await db.leave.update({
        where: { id },
        data: {
          status,
          managerId,
          reviewedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
          manager: { select: { id: true, name: true, email: true } },
        },
      });

      // Push real-time notification to the employee
      try {
        await db.notification.create({
          data: {
            userId: existing.userId,
            type: 'LEAVE_UPDATE',
            title: `Leave ${status.toLowerCase()}`,
            message: `Your ${existing.type.toLowerCase()} leave has been ${status.toLowerCase()}`,
          },
        });
        emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
          title: `Leave ${status.toLowerCase()}`,
          message: `Your ${existing.type.toLowerCase()} leave has been ${status.toLowerCase()}`,
          type: 'LEAVE_UPDATE',
          createdAt: new Date().toISOString(),
        }).catch(() => {});
        emitRealtimeEvent(existing.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, {
          leaveId: id,
          status: status.toLowerCase(),
        }).catch(() => {});
      } catch (notifErr) {
        console.warn('Failed to send leave notification:', notifErr);
      }

      return NextResponse.json({
        status: 'success',
        message: `Leave ${status.toLowerCase()} successfully`,
        data: leave,
      });
    } catch (error) {
      console.error('Leaves PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update leave status' },
        { status: 500 }
      );
    }
  });
}
