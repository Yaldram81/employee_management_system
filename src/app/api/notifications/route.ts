import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      let userId = searchParams.get('userId');
      const type = searchParams.get('type');
      const isRead = searchParams.get('isRead');

      // Users can only see their own notifications
      userId = user.userId;

      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;
      if (type) where.type = type;
      if (isRead !== null && isRead !== undefined) {
        where.isRead = isRead === 'true';
      }

      const notifications = await db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Notifications fetched successfully',
        data: notifications,
      });
    } catch (error) {
      console.error('Notifications GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { type, title, message, actionUrl } = body;

      // Users can only create notifications for themselves
      const userId = user.userId;

      if (!type || !title || !message) {
        return NextResponse.json(
          { status: 'error', message: 'Type, title, and message are required' },
          { status: 400 }
        );
      }

      const notification = await db.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          actionUrl: actionUrl || null,
        },
      });

      return NextResponse.json(
        {
          status: 'success',
          message: 'Notification created successfully',
          data: notification,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Notifications POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create notification' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, isRead, markAllForUser } = body;

      if (markAllForUser) {
        // Force to mark all for the authenticated user only
        await db.notification.updateMany({
          where: { userId: user.userId, isRead: false },
          data: { isRead: true },
        });

        return NextResponse.json({
          status: 'success',
          message: 'All notifications marked as read',
          data: null,
        });
      }

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Notification ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.notification.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Notification not found' },
          { status: 404 }
        );
      }

      // Users can only update their own notifications
      if (existing.userId !== user.userId) {
        return NextResponse.json(
          { status: 'error', message: 'You can only update your own notifications' },
          { status: 403 }
        );
      }

      const notification = await db.notification.update({
        where: { id },
        data: { isRead: isRead !== undefined ? isRead : true },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Notification updated successfully',
        data: notification,
      });
    } catch (error) {
      console.error('Notifications PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update notification' },
        { status: 500 }
      );
    }
  });
}
