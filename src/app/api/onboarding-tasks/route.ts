import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/onboarding-tasks - List tasks for a plan
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onboardingPlanId = searchParams.get('onboardingPlanId');
    const category = searchParams.get('category');
    const isCompleted = searchParams.get('isCompleted');

    const where: Record<string, unknown> = {};
    if (onboardingPlanId) where.onboardingPlanId = onboardingPlanId;
    if (category) where.category = category.toUpperCase();
    if (isCompleted !== null && isCompleted !== undefined && isCompleted !== '') {
      where.isCompleted = isCompleted === 'true';
    }

    const tasks = await db.onboardingTask.findMany({
      where,
      orderBy: { dueDay: 'asc' },
    });

    return NextResponse.json({ status: 'success', data: tasks });
  } catch (error) {
    console.error('Onboarding Tasks GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch onboarding tasks' },
      { status: 500 }
    );
  }
}

// POST /api/onboarding-tasks - Add task to plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      onboardingPlanId,
      title,
      category,
      isCompleted,
      dueDay,
      notes,
      assignedToId,
    } = body;

    if (!onboardingPlanId || !title) {
      return NextResponse.json(
        { status: 'error', message: 'Onboarding plan ID and title are required' },
        { status: 400 }
      );
    }

    // Verify onboarding plan exists
    const plan = await db.onboardingPlan.findUnique({ where: { id: onboardingPlanId } });
    if (!plan) {
      return NextResponse.json(
        { status: 'error', message: 'Onboarding plan not found' },
        { status: 404 }
      );
    }

    const task = await db.onboardingTask.create({
      data: {
        onboardingPlanId,
        title,
        category: category || 'SETUP',
        isCompleted: isCompleted || false,
        dueDay: dueDay || 1,
        notes: notes || null,
        assignedToId: assignedToId || null,
      },
    });

    // Recalculate plan progress
    await recalculatePlanProgress(onboardingPlanId);

    return NextResponse.json(
      { status: 'success', message: 'Task added successfully', data: task },
      { status: 201 }
    );
  } catch (error) {
    console.error('Onboarding Tasks POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to add task' },
      { status: 500 }
    );
  }
}

// PUT /api/onboarding-tasks - Toggle task completion, update task
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Task ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.onboardingTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Task not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.isCompleted !== undefined) {
      data.isCompleted = updates.isCompleted;
      // Set completedAt when completing a task
      if (updates.isCompleted) {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (updates.dueDay !== undefined) data.dueDay = Number(updates.dueDay);
    if (updates.notes !== undefined) data.notes = updates.notes || null;
    if (updates.assignedToId !== undefined) data.assignedToId = updates.assignedToId || null;

    const task = await db.onboardingTask.update({
      where: { id },
      data,
    });

    // Recalculate plan progress
    await recalculatePlanProgress(existing.onboardingPlanId);

    return NextResponse.json({
      status: 'success',
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Onboarding Tasks PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/onboarding-tasks - Remove task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Task ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.onboardingTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Task not found' },
        { status: 404 }
      );
    }

    const planId = existing.onboardingPlanId;

    await db.onboardingTask.delete({ where: { id } });

    // Recalculate plan progress
    await recalculatePlanProgress(planId);

    return NextResponse.json({
      status: 'success',
      message: 'Task removed successfully',
    });
  } catch (error) {
    console.error('Onboarding Tasks DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to remove task' },
      { status: 500 }
    );
  }
}

// Helper: Recalculate onboarding plan progress based on task completion
async function recalculatePlanProgress(planId: string) {
  const tasks = await db.onboardingTask.findMany({
    where: { onboardingPlanId: planId },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine status based on progress
  let status = 'NOT_STARTED';
  if (progress === 100) {
    status = 'COMPLETED';
  } else if (progress > 0) {
    status = 'IN_PROGRESS';
  }

  await db.onboardingPlan.update({
    where: { id: planId },
    data: { progress, status },
  });
}
