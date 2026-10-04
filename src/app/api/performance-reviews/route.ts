import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/performance-reviews - List reviews with user/reviewer info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const reviewerId = searchParams.get('reviewerId');
    const status = searchParams.get('status');
    const cycleName = searchParams.get('cycleName');

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (status) where.status = status.toUpperCase();
    if (cycleName) where.cycleName = cycleName;

    const reviews = await db.performanceReview.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
        reviewer: { select: { id: true, name: true, email: true, position: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: reviews });
  } catch (error) {
    console.error('Performance Reviews GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch performance reviews' },
      { status: 500 }
    );
  }
}

// POST /api/performance-reviews - Create new review
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      cycleName,
      status,
      rating,
      goalScore,
      competencyScore,
      reviewerId,
      dueDate,
      selfAssessment,
      managerFeedback,
      strengths,
      improvements,
      goals,
    } = body;

    if (!userId || !cycleName || !dueDate) {
      return NextResponse.json(
        { status: 'error', message: 'User ID, cycle name, and due date are required' },
        { status: 400 }
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

    // Verify reviewer exists if provided
    if (reviewerId) {
      const reviewer = await db.user.findUnique({ where: { id: reviewerId } });
      if (!reviewer) {
        return NextResponse.json(
          { status: 'error', message: 'Reviewer not found' },
          { status: 404 }
        );
      }
    }

    const review = await db.performanceReview.create({
      data: {
        userId,
        cycleName,
        status: status || 'NOT_STARTED',
        rating: rating != null ? Number(rating) : 0,
        goalScore: goalScore != null ? Number(goalScore) : null,
        competencyScore: competencyScore != null ? Number(competencyScore) : null,
        reviewerId: reviewerId || null,
        dueDate,
        selfAssessment: selfAssessment ? JSON.stringify(selfAssessment) : null,
        managerFeedback: managerFeedback ? JSON.stringify(managerFeedback) : null,
        strengths: strengths ? JSON.stringify(strengths) : null,
        improvements: improvements ? JSON.stringify(improvements) : null,
        goals: goals ? JSON.stringify(goals) : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
        reviewer: { select: { id: true, name: true, email: true, position: true } },
      },
    });

    return NextResponse.json(
      { status: 'success', message: 'Performance review created successfully', data: review },
      { status: 201 }
    );
  } catch (error) {
    console.error('Performance Reviews POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create performance review' },
      { status: 500 }
    );
  }
}

// PUT /api/performance-reviews - Update review
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Review ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.performanceReview.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Performance review not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.cycleName !== undefined) data.cycleName = updates.cycleName;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.rating !== undefined) data.rating = Number(updates.rating);
    if (updates.goalScore !== undefined) data.goalScore = updates.goalScore != null ? Number(updates.goalScore) : null;
    if (updates.competencyScore !== undefined) data.competencyScore = updates.competencyScore != null ? Number(updates.competencyScore) : null;
    if (updates.reviewerId !== undefined) data.reviewerId = updates.reviewerId || null;
    if (updates.dueDate !== undefined) data.dueDate = updates.dueDate;
    if (updates.selfAssessment !== undefined) data.selfAssessment = updates.selfAssessment ? JSON.stringify(updates.selfAssessment) : null;
    if (updates.managerFeedback !== undefined) data.managerFeedback = updates.managerFeedback ? JSON.stringify(updates.managerFeedback) : null;
    if (updates.strengths !== undefined) data.strengths = updates.strengths ? JSON.stringify(updates.strengths) : null;
    if (updates.improvements !== undefined) data.improvements = updates.improvements ? JSON.stringify(updates.improvements) : null;
    if (updates.goals !== undefined) data.goals = updates.goals ? JSON.stringify(updates.goals) : null;

    // Set completedAt if status is COMPLETED
    if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      data.completedAt = new Date();
    }

    const review = await db.performanceReview.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
        reviewer: { select: { id: true, name: true, email: true, position: true } },
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Performance review updated successfully',
      data: review,
    });
  } catch (error) {
    console.error('Performance Reviews PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update performance review' },
      { status: 500 }
    );
  }
}

// DELETE /api/performance-reviews - Delete a review
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Review ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.performanceReview.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Performance review not found' },
        { status: 404 }
      );
    }

    await db.performanceReview.delete({ where: { id } });

    return NextResponse.json({
      status: 'success',
      message: 'Performance review deleted successfully',
    });
  } catch (error) {
    console.error('Performance Reviews DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete performance review' },
      { status: 500 }
    );
  }
}
