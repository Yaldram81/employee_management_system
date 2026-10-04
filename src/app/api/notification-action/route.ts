import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { emitRealtimeEvent, RealtimeEvents } from '@/lib/realtime';

/**
 * POST /api/notification-action
 * Execute an action directly from a notification (approve/reject leave, request, etc.)
 *
 * Body: { notificationId, action: 'approve' | 'reject' | 'acknowledge', comment? }
 */
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { notificationId, action, comment } = await request.json();

      if (!notificationId || !action) {
        return NextResponse.json(
          { status: 'error', message: 'notificationId and action are required' },
          { status: 400 }
        );
      }

      // Fetch the notification
      const notification = await db.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          { status: 'error', message: 'Notification not found' },
          { status: 404 }
        );
      }

      // Only the notification owner can act on it
      if (notification.userId !== user.userId) {
        return NextResponse.json(
          { status: 'error', message: 'You can only act on your own notifications' },
          { status: 403 }
        );
      }

      // Parse actionData
      let actionData: { entityType?: string; entityId?: string; actions?: string[] } = {};
      try {
        actionData = notification.actionData ? JSON.parse(notification.actionData) : {};
      } catch {
        actionData = {};
      }

      const { entityType, entityId } = actionData;

      if (!entityType || !entityId) {
        return NextResponse.json(
          { status: 'error', message: 'This notification does not support direct actions' },
          { status: 400 }
        );
      }

      // Mark notification as read
      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      let result: Record<string, unknown> = {};

      // Execute the action based on entity type
      if (entityType === 'leave') {
        if (action === 'approve') {
          const leave = await db.leave.update({
            where: { id: entityId },
            data: {
              status: 'APPROVED',
              managerId: user.userId,
              reviewedAt: new Date(),
            },
          });
          // Notify the leave owner
          await emitRealtimeEvent(leave.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, {
            leaveId: leave.id,
            status: 'approved',
            comment: comment || 'Approved via notification',
          });
          result = { leaveId: leave.id, status: 'approved' };
        } else if (action === 'reject') {
          const leave = await db.leave.update({
            where: { id: entityId },
            data: {
              status: 'REJECTED',
              managerId: user.userId,
              reviewedAt: new Date(),
            },
          });
          await emitRealtimeEvent(leave.userId, RealtimeEvents.LEAVE_STATUS_CHANGED, {
            leaveId: leave.id,
            status: 'rejected',
            comment: comment || 'Rejected via notification',
          });
          result = { leaveId: leave.id, status: 'rejected' };
        }
      } else if (entityType === 'request') {
        if (action === 'approve') {
          const req = await db.request.update({
            where: { id: entityId },
            data: {
              status: 'APPROVED',
              reviewerId: user.userId,
              reviewedAt: new Date(),
              reviewComment: comment || 'Approved via notification',
            },
          });
          await emitRealtimeEvent(req.userId, RealtimeEvents.REQUEST_STATUS_CHANGED, {
            requestId: req.id,
            status: 'approved',
            comment: comment || 'Approved via notification',
          });
          result = { requestId: req.id, status: 'approved' };
        } else if (action === 'reject') {
          const req = await db.request.update({
            where: { id: entityId },
            data: {
              status: 'REJECTED',
              reviewerId: user.userId,
              reviewedAt: new Date(),
              reviewComment: comment || 'Rejected via notification',
            },
          });
          await emitRealtimeEvent(req.userId, RealtimeEvents.REQUEST_STATUS_CHANGED, {
            requestId: req.id,
            status: 'rejected',
            comment: comment || 'Rejected via notification',
          });
          result = { requestId: req.id, status: 'rejected' };
        }
      } else if (entityType === 'task') {
        if (action === 'acknowledge') {
          result = { taskId: entityId, status: 'acknowledged' };
        }
      } else if (entityType === 'complaint') {
        if (action === 'acknowledge') {
          result = { complaintId: entityId, status: 'acknowledged' };
        }
      }

      // Create a confirmation notification for the actor
      await db.notification.create({
        data: {
          userId: user.userId,
          type: 'SUCCESS',
          title: 'Action Completed',
          message: `You ${action}d the ${entityType} successfully.`,
          isRead: false,
        },
      });

      return NextResponse.json({
        status: 'success',
        message: `Action "${action}" executed successfully on ${entityType}`,
        data: result,
      });
    } catch (error) {
      console.error('Notification action error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to execute notification action' },
        { status: 500 }
      );
    }
  });
}
