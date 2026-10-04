import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/task-dependencies?taskId=xxx — Get dependencies for a task
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const taskId = searchParams.get('taskId');

      if (!taskId) {
        return NextResponse.json(
          { status: 'error', message: 'taskId is required' },
          { status: 400 }
        );
      }

      const dependsOn = await db.taskDependency.findMany({
        where: { taskId },
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true, priority: true },
          },
        },
      });

      const blockedBy = await db.taskDependency.findMany({
        where: { dependsOnTaskId: taskId },
        include: {
          task: {
            select: { id: true, title: true, status: true, priority: true },
          },
        },
      });

      return NextResponse.json({
        status: 'success',
        data: {
          dependsOn: dependsOn.map(d => ({
            id: d.id,
            taskId: d.taskId,
            dependsOnTaskId: d.dependsOnTaskId,
            task: d.dependsOnTask,
          })),
          blockedBy: blockedBy.map(d => ({
            id: d.id,
            taskId: d.taskId,
            dependsOnTaskId: d.dependsOnTaskId,
            task: d.task,
          })),
        },
      });
    } catch (error) {
      console.error('Task dependencies GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch dependencies' },
        { status: 500 }
      );
    }
  });
}

// POST /api/task-dependencies — Add a dependency
export async function POST(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const { taskId, dependsOnTaskId } = await request.json();

      if (!taskId || !dependsOnTaskId) {
        return NextResponse.json(
          { status: 'error', message: 'taskId and dependsOnTaskId are required' },
          { status: 400 }
        );
      }

      if (taskId === dependsOnTaskId) {
        return NextResponse.json(
          { status: 'error', message: 'A task cannot depend on itself' },
          { status: 400 }
        );
      }

      const existingReverse = await db.taskDependency.findUnique({
        where: { taskId_dependsOnTaskId: { taskId: dependsOnTaskId, dependsOnTaskId: taskId } },
      });
      if (existingReverse) {
        return NextResponse.json(
          { status: 'error', message: 'Circular dependency detected' },
          { status: 400 }
        );
      }

      const dependency = await db.taskDependency.create({
        data: { taskId, dependsOnTaskId },
        include: {
          dependsOnTask: { select: { id: true, title: true, status: true } },
          task: { select: { id: true, title: true, status: true } },
        },
      });

      const depTask = await db.task.findUnique({ where: { id: dependsOnTaskId } });
      if (depTask && depTask.status !== 'DONE') {
        await db.task.update({
          where: { id: taskId },
          data: { isBlocked: true, blockedReason: `Waiting on: ${depTask.title}`, status: 'BLOCKED' },
        });
      }

      return NextResponse.json({ status: 'success', data: dependency }, { status: 201 });
    } catch (error) {
      console.error('Task dependency POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to add dependency' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/task-dependencies?id=xxx — Remove a dependency
export async function DELETE(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Dependency ID is required' },
          { status: 400 }
        );
      }

      await db.taskDependency.delete({ where: { id } });

      return NextResponse.json({ status: 'success', message: 'Dependency removed' });
    } catch (error) {
      console.error('Task dependency DELETE error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to remove dependency' },
        { status: 500 }
      );
    }
  });
}
