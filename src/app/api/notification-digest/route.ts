import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/notification-digest?since=YYYY-MM-DDTHH:mm:ss.sssZ
 * Returns a smart digest summary of notifications since the given timestamp.
 * If no "since" provided, defaults to 24 hours ago.
 */
export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const sinceParam = searchParams.get('since');
      const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Fetch notifications since the given time
      const notifications = await db.notification.findMany({
        where: {
          userId: user.userId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Smart grouping: count by type
      const groupCounts: Record<string, number> = {};
      const groupItems: Record<string, typeof notifications> = {};

      for (const n of notifications) {
        const key = n.type.toLowerCase().replace(/_/g, '-');
        groupCounts[key] = (groupCounts[key] || 0) + 1;
        if (!groupItems[key]) groupItems[key] = [];
        groupItems[key].push(n);
      }

      // Build grouped summary
      const typeLabels: Record<string, string> = {
        'approval-required': 'Approvals needed',
        'attendance': 'Attendance updates',
        'leave-update': 'Leave updates',
        'task-assigned': 'Task assignments',
        'complaint-update': 'Complaint updates',
        'general': 'General',
        'info': 'Info',
        'success': 'Success',
        'warning': 'Warnings',
        'error': 'Errors',
      };

      const grouped = Object.entries(groupCounts).map(([type, count]) => ({
        type,
        label: typeLabels[type] || type,
        count,
        items: groupItems[type],
      }));

      // Actionable items (those with actionData or approval types)
      const actionable = notifications.filter(n => {
        if (n.type === 'APPROVAL_REQUIRED' || n.type === 'approval-required') return true;
        try {
          const ad = n.actionData ? JSON.parse(n.actionData as string) : {};
          return ad.actions && ad.actions.length > 0;
        } catch {
          return false;
        }
      });

      // Unread count
      const unreadCount = notifications.filter(n => !n.isRead).length;

      // Time-based grouping: today, yesterday, earlier this week, older
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const timeGroups = {
        today: notifications.filter(n => new Date(n.createdAt) >= today),
        yesterday: notifications.filter(n => {
          const d = new Date(n.createdAt);
          return d >= yesterday && d < today;
        }),
        earlier: notifications.filter(n => new Date(n.createdAt) < yesterday),
      };

      return NextResponse.json({
        status: 'success',
        data: {
          since: since.toISOString(),
          total: notifications.length,
          unreadCount,
          grouped,
          actionable,
          timeGroups: {
            today: timeGroups.today.length,
            yesterday: timeGroups.yesterday.length,
            earlier: timeGroups.earlier.length,
          },
        },
      });
    } catch (error) {
      console.error('Notification digest error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch notification digest' },
        { status: 500 }
      );
    }
  });
}
