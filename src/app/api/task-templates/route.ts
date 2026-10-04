import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// GET /api/task-templates — List all task templates
export async function GET(request: NextRequest) {
  return requireRole(request, ['admin', 'manager', 'employee'], async () => {
    try {
      const templates = await db.taskTemplate.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ status: 'success', data: templates });
    } catch (error) {
      console.error('Get task templates error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch templates' }, { status: 500 });
    }
  });
}

// POST /api/task-templates — Create a task template
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const { name, description, category, taskItems } = await request.json();
      if (!name || !category || !taskItems) {
        return NextResponse.json({ status: 'error', message: 'name, category, and taskItems are required' }, { status: 400 });
      }

      const template = await db.taskTemplate.create({
        data: {
          name,
          description: description || null,
          category,
          taskItems,
          createdBy: user.userId,
        },
      });

      return NextResponse.json({ status: 'success', data: template });
    } catch (error) {
      console.error('Create task template error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to create template' }, { status: 500 });
    }
  });
}
