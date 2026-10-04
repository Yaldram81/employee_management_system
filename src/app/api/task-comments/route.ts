import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// GET /api/task-comments?taskId=xxx
export async function GET(request: NextRequest) {
  return requireRole(request, ['admin', 'manager', 'employee'], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const taskId = searchParams.get('taskId');
      if (!taskId) {
        return NextResponse.json({ status: 'error', message: 'taskId is required' }, { status: 400 });
      }

      const comments = await db.taskComment.findMany({
        where: { taskId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({ status: 'success', data: comments });
    } catch (error) {
      console.error('Get task comments error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch comments' }, { status: 500 });
    }
  });
}

// POST /api/task-comments — Add a comment
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin', 'manager', 'employee'], async (user) => {
    try {
      const { taskId, comment } = await request.json();
      if (!taskId || !comment) {
        return NextResponse.json({ status: 'error', message: 'taskId and comment are required' }, { status: 400 });
      }

      const taskComment = await db.taskComment.create({
        data: { taskId, userId: user.userId, comment },
        include: { user: { select: { id: true, name: true } } },
      });

      return NextResponse.json({ status: 'success', data: taskComment });
    } catch (error) {
      console.error('Create task comment error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to create comment' }, { status: 500 });
    }
  });
}
