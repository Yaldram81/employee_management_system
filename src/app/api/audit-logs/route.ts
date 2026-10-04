import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/audit-logs?entity=department|user — Returns audit/activity logs
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const entity = searchParams.get('entity'); // 'department', 'user', etc.
      const limit = parseInt(searchParams.get('limit') || '50', 10);

      // Build activity log from lifecycle events
      const lifecycleEvents = await db.lifecycleEvent.findMany({
        where: entity ? { type: entity.toUpperCase() } : undefined,
        include: {
          user: { select: { name: true } },
          approver: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const data = lifecycleEvents.map((e) => ({
        id: e.id,
        type: e.type.toLowerCase(),
        description: e.details,
        userId: e.userId,
        userName: e.user?.name || e.employeeName || 'Unknown',
        timestamp: e.createdAt.toISOString(),
        status: e.status,
        fromValue: e.fromValue,
        toValue: e.toValue,
      }));

      return NextResponse.json({ status: 'success', data });
    } catch (error) {
      console.error('Audit logs GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }
  });
}
