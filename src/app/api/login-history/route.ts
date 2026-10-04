import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// GET /api/login-history?userId=xxx — Returns login sessions for a user
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { status: 'error', message: 'userId query parameter is required' },
          { status: 400 }
        );
      }

      const sessions = await db.loginSession.findMany({
        where: { userId },
        orderBy: { loginAt: 'desc' },
        take: 20,
      });

      const data = sessions.map((s) => ({
        id: s.id,
        device: s.device,
        ip: s.ip,
        time: timeAgo(s.loginAt),
        current: s.isCurrent,
        loginAt: s.loginAt.toISOString(),
      }));

      return NextResponse.json({ status: 'success', data });
    } catch (error) {
      console.error('Login history GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch login history' },
        { status: 500 }
      );
    }
  });
}

// POST /api/login-history — Create a new login session
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { device, ip, userAgent } = body;

      // Mark all existing sessions for this user as not current
      await db.loginSession.updateMany({
        where: { userId: user.userId, isCurrent: true },
        data: { isCurrent: false },
      });

      const session = await db.loginSession.create({
        data: {
          userId: user.userId,
          device: device || 'Unknown',
          ip: ip || '0.0.0.0',
          userAgent: userAgent || null,
          isCurrent: true,
        },
      });

      return NextResponse.json({ status: 'success', data: session }, { status: 201 });
    } catch (error) {
      console.error('Login history POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create login session' },
        { status: 500 }
      );
    }
  });
}
