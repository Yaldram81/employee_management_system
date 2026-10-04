import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/announcements — Returns all active announcements (global, not user-specific)
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const announcements = await db.announcement.findMany({
        where: { isActive: true },
        orderBy: { date: 'desc' },
      });

      const data = announcements.map((a) => ({
        id: a.id,
        title: a.title,
        date: a.date,
        priority: a.priority,
        category: a.category,
        message: a.message,
        isRead: false, // Read status is tracked client-side in localStorage
      }));

      return NextResponse.json({ status: 'success', data });
    } catch (error) {
      console.error('Announcements GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }
  });
}

// POST /api/announcements — Create a new announcement (admin only)
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    if (user.role.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json();
      const { title, date, priority, category, message } = body;

      if (!title || !date) {
        return NextResponse.json(
          { status: 'error', message: 'title and date are required' },
          { status: 400 }
        );
      }

      const announcement = await db.announcement.create({
        data: {
          title,
          date,
          priority: priority || 'medium',
          category: category || 'general',
          message: message || null,
        },
      });

      return NextResponse.json({ status: 'success', data: announcement }, { status: 201 });
    } catch (error) {
      console.error('Announcements POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create announcement' },
        { status: 500 }
      );
    }
  });
}
