import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/training-enrollments - List enrollments with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trainingProgramId = searchParams.get('trainingProgramId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (trainingProgramId) where.trainingProgramId = trainingProgramId;
    if (userId) where.userId = userId;
    if (status) where.status = status.toUpperCase();

    const enrollments = await db.trainingEnrollment.findMany({
      where,
      include: {
        trainingProgram: { select: { id: true, title: true, category: true, status: true, startDate: true, endDate: true } },
        user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: enrollments });
  } catch (error) {
    console.error('Training Enrollments GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

// POST /api/training-enrollments - Enroll user in training
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trainingProgramId, userId, status } = body;

    if (!trainingProgramId || !userId) {
      return NextResponse.json(
        { status: 'error', message: 'Training program ID and user ID are required' },
        { status: 400 }
      );
    }

    // Verify training program exists
    const program = await db.trainingProgram.findUnique({
      where: { id: trainingProgramId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!program) {
      return NextResponse.json(
        { status: 'error', message: 'Training program not found' },
        { status: 404 }
      );
    }

    // Check max enrollment
    if (program.maxEnrollment && program._count.enrollments >= program.maxEnrollment) {
      return NextResponse.json(
        { status: 'error', message: 'Training program has reached maximum enrollment capacity' },
        { status: 409 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check for existing enrollment (unique constraint)
    const existingEnrollment = await db.trainingEnrollment.findUnique({
      where: { trainingProgramId_userId: { trainingProgramId, userId } },
    });
    if (existingEnrollment) {
      return NextResponse.json(
        { status: 'error', message: 'User is already enrolled in this training program' },
        { status: 409 }
      );
    }

    const enrollment = await db.trainingEnrollment.create({
      data: {
        trainingProgramId,
        userId,
        status: status || 'ENROLLED',
      },
      include: {
        trainingProgram: { select: { id: true, title: true, category: true, status: true, startDate: true, endDate: true } },
        user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
      },
    });

    // Increment enrollment count on the program
    await db.trainingProgram.update({
      where: { id: trainingProgramId },
      data: { enrollmentCount: { increment: 1 } },
    });

    return NextResponse.json(
      { status: 'success', message: 'User enrolled successfully', data: enrollment },
      { status: 201 }
    );
  } catch (error) {
    console.error('Training Enrollments POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to enroll user' },
      { status: 500 }
    );
  }
}

// PUT /api/training-enrollments - Update enrollment status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Enrollment ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.trainingEnrollment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Enrollment not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.score !== undefined) data.score = updates.score != null ? Number(updates.score) : null;
    if (updates.certificateUrl !== undefined) data.certificateUrl = updates.certificateUrl || null;
    if (updates.feedback !== undefined) data.feedback = updates.feedback || null;

    // Set completedAt if status is COMPLETED
    if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      data.completedAt = new Date();
    }

    const enrollment = await db.trainingEnrollment.update({
      where: { id },
      data,
      include: {
        trainingProgram: { select: { id: true, title: true, category: true, status: true, startDate: true, endDate: true } },
        user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
      },
    });

    // If cancelling, decrement enrollment count
    if (updates.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      await db.trainingProgram.update({
        where: { id: existing.trainingProgramId },
        data: { enrollmentCount: { decrement: 1 } },
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Enrollment updated successfully',
      data: enrollment,
    });
  } catch (error) {
    console.error('Training Enrollments PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update enrollment' },
      { status: 500 }
    );
  }
}

// DELETE /api/training-enrollments - Remove enrollment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Enrollment ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.trainingEnrollment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Enrollment not found' },
        { status: 404 }
      );
    }

    await db.trainingEnrollment.delete({ where: { id } });

    // Decrement enrollment count if not already cancelled
    if (existing.status !== 'CANCELLED') {
      await db.trainingProgram.update({
        where: { id: existing.trainingProgramId },
        data: { enrollmentCount: { decrement: 1 } },
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Enrollment removed successfully',
    });
  } catch (error) {
    console.error('Training Enrollments DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to remove enrollment' },
      { status: 500 }
    );
  }
}
