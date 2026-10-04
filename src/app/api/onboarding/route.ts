import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/onboarding - List onboarding plans with tasks, buddy/mentor info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status.toUpperCase();
    if (departmentId) where.departmentId = departmentId;
    if (userId) where.userId = userId;

    const onboardingPlans = await db.onboardingPlan.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, color: true } },
        buddy: { select: { id: true, name: true, email: true, position: true } },
        mentor: { select: { id: true, name: true, email: true, position: true } },
        tasks: { orderBy: { dueDay: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: onboardingPlans });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch onboarding plans' },
      { status: 500 }
    );
  }
}

// POST /api/onboarding - Create onboarding plan with tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      employeeName,
      email,
      departmentId,
      startDate,
      endDate,
      progress,
      status,
      buddyId,
      mentorId,
      tasks,
    } = body;

    if (!employeeName || !startDate) {
      return NextResponse.json(
        { status: 'error', message: 'Employee name and start date are required' },
        { status: 400 }
      );
    }

    const onboardingPlan = await db.onboardingPlan.create({
      data: {
        userId: userId || null,
        employeeName,
        email: email || null,
        departmentId: departmentId || null,
        startDate,
        endDate: endDate || null,
        progress: progress || 0,
        status: status || 'NOT_STARTED',
        buddyId: buddyId || null,
        mentorId: mentorId || null,
        tasks: tasks && tasks.length > 0
          ? {
              create: tasks.map((task: { title: string; category?: string; isCompleted?: boolean; dueDay?: number; notes?: string; assignedToId?: string }) => ({
                title: task.title,
                category: task.category || 'SETUP',
                isCompleted: task.isCompleted || false,
                dueDay: task.dueDay || 1,
                notes: task.notes || null,
                assignedToId: task.assignedToId || null,
              })),
            }
          : undefined,
      },
      include: {
        department: { select: { id: true, name: true, color: true } },
        buddy: { select: { id: true, name: true, email: true, position: true } },
        mentor: { select: { id: true, name: true, email: true, position: true } },
        tasks: { orderBy: { dueDay: 'asc' } },
      },
    });

    return NextResponse.json(
      { status: 'success', message: 'Onboarding plan created successfully', data: onboardingPlan },
      { status: 201 }
    );
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create onboarding plan' },
      { status: 500 }
    );
  }
}

// PUT /api/onboarding - Update onboarding plan
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Onboarding plan ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.onboardingPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Onboarding plan not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.userId !== undefined) data.userId = updates.userId || null;
    if (updates.employeeName !== undefined) data.employeeName = updates.employeeName;
    if (updates.email !== undefined) data.email = updates.email || null;
    if (updates.departmentId !== undefined) data.departmentId = updates.departmentId || null;
    if (updates.startDate !== undefined) data.startDate = updates.startDate;
    if (updates.endDate !== undefined) data.endDate = updates.endDate || null;
    if (updates.progress !== undefined) data.progress = Number(updates.progress);
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.buddyId !== undefined) data.buddyId = updates.buddyId || null;
    if (updates.mentorId !== undefined) data.mentorId = updates.mentorId || null;

    const onboardingPlan = await db.onboardingPlan.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true, color: true } },
        buddy: { select: { id: true, name: true, email: true, position: true } },
        mentor: { select: { id: true, name: true, email: true, position: true } },
        tasks: { orderBy: { dueDay: 'asc' } },
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Onboarding plan updated successfully',
      data: onboardingPlan,
    });
  } catch (error) {
    console.error('Onboarding PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update onboarding plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/onboarding - Delete an onboarding plan
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Onboarding plan ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.onboardingPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Onboarding plan not found' },
        { status: 404 }
      );
    }

    // Tasks will be cascade deleted
    await db.onboardingPlan.delete({ where: { id } });

    return NextResponse.json({
      status: 'success',
      message: 'Onboarding plan deleted successfully',
    });
  } catch (error) {
    console.error('Onboarding DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete onboarding plan' },
      { status: 500 }
    );
  }
}
