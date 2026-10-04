import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/training - List training programs with enrollment info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const format = searchParams.get('format');

    const where: Record<string, unknown> = {};
    if (category) where.category = category.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (format) where.format = format.toUpperCase();

    const trainingPrograms = await db.trainingProgram.findMany({
      where,
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: trainingPrograms });
  } catch (error) {
    console.error('Training GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch training programs' },
      { status: 500 }
    );
  }
}

// POST /api/training - Create new training program
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      category,
      format,
      duration,
      maxEnrollment,
      rating,
      status,
      hasCertification,
      startDate,
      endDate,
      instructor,
      curriculum,
    } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { status: 'error', message: 'Title and start date are required' },
        { status: 400 }
      );
    }

    const trainingProgram = await db.trainingProgram.create({
      data: {
        title,
        description: description || null,
        category: category || 'TECHNICAL',
        format: format || 'ONLINE',
        duration: duration || '',
        maxEnrollment: maxEnrollment != null ? Number(maxEnrollment) : null,
        rating: rating != null ? Number(rating) : 0,
        status: status || 'UPCOMING',
        hasCertification: hasCertification || false,
        startDate,
        endDate: endDate || null,
        instructor: instructor || null,
        curriculum: curriculum ? JSON.stringify(curriculum) : null,
      },
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json(
      { status: 'success', message: 'Training program created successfully', data: trainingProgram },
      { status: 201 }
    );
  } catch (error) {
    console.error('Training POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create training program' },
      { status: 500 }
    );
  }
}

// PUT /api/training - Update training program
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Training program ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.trainingProgram.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Training program not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description || null;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.format !== undefined) data.format = updates.format;
    if (updates.duration !== undefined) data.duration = updates.duration;
    if (updates.enrollmentCount !== undefined) data.enrollmentCount = Number(updates.enrollmentCount);
    if (updates.maxEnrollment !== undefined) data.maxEnrollment = updates.maxEnrollment != null ? Number(updates.maxEnrollment) : null;
    if (updates.rating !== undefined) data.rating = Number(updates.rating);
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.hasCertification !== undefined) data.hasCertification = updates.hasCertification;
    if (updates.startDate !== undefined) data.startDate = updates.startDate;
    if (updates.endDate !== undefined) data.endDate = updates.endDate || null;
    if (updates.instructor !== undefined) data.instructor = updates.instructor || null;
    if (updates.curriculum !== undefined) data.curriculum = updates.curriculum ? JSON.stringify(updates.curriculum) : null;

    const trainingProgram = await db.trainingProgram.update({
      where: { id },
      data,
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Training program updated successfully',
      data: trainingProgram,
    });
  } catch (error) {
    console.error('Training PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update training program' },
      { status: 500 }
    );
  }
}

// DELETE /api/training - Delete a training program
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Training program ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.trainingProgram.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Training program not found' },
        { status: 404 }
      );
    }

    if (existing._count.enrollments > 0) {
      return NextResponse.json(
        { status: 'error', message: `Cannot delete training program with ${existing._count.enrollments} enrollment(s). Cancel enrollments first.` },
        { status: 409 }
      );
    }

    await db.trainingProgram.delete({ where: { id } });

    return NextResponse.json({
      status: 'success',
      message: 'Training program deleted successfully',
    });
  } catch (error) {
    console.error('Training DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete training program' },
      { status: 500 }
    );
  }
}
