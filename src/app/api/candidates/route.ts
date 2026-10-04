import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/candidates - List candidates with job posting info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const jobPostingId = searchParams.get('jobPostingId');
    const source = searchParams.get('source');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (stage) where.stage = stage.toUpperCase();
    if (jobPostingId) where.jobPostingId = jobPostingId;
    if (source) where.source = source.toUpperCase();

    // 'status' is a convenience filter: 'active' excludes HIRED/REJECTED
    if (status === 'active') {
      where.stage = { notIn: ['HIRED', 'REJECTED'] };
    }

    const candidates = await db.candidate.findMany({
      where,
      include: {
        jobPosting: {
          select: { id: true, title: true, department: { select: { id: true, name: true } }, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: candidates });
  } catch (error) {
    console.error('Candidates GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}

// POST /api/candidates - Create new candidate
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      jobPostingId,
      stage,
      rating,
      source,
      appliedDate,
      notes,
      avatar,
      resumeUrl,
      interviewDate,
    } = body;

    if (!name || !email || !jobPostingId || !appliedDate) {
      return NextResponse.json(
        { status: 'error', message: 'Name, email, job posting ID, and applied date are required' },
        { status: 400 }
      );
    }

    // Verify job posting exists
    const jobPosting = await db.jobPosting.findUnique({ where: { id: jobPostingId } });
    if (!jobPosting) {
      return NextResponse.json(
        { status: 'error', message: 'Job posting not found' },
        { status: 404 }
      );
    }

    const candidate = await db.candidate.create({
      data: {
        name,
        email,
        phone: phone || null,
        jobPostingId,
        stage: stage || 'APPLIED',
        rating: rating != null ? Number(rating) : 0,
        source: source || 'OTHER',
        appliedDate,
        notes: notes || null,
        avatar: avatar || null,
        resumeUrl: resumeUrl || null,
        interviewDate: interviewDate || null,
      },
      include: {
        jobPosting: {
          select: { id: true, title: true, department: { select: { id: true, name: true } }, status: true },
        },
      },
    });

    // Increment applicant count on the job posting
    await db.jobPosting.update({
      where: { id: jobPostingId },
      data: { applicantCount: { increment: 1 } },
    });

    return NextResponse.json(
      { status: 'success', message: 'Candidate created successfully', data: candidate },
      { status: 201 }
    );
  } catch (error) {
    console.error('Candidates POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create candidate' },
      { status: 500 }
    );
  }
}

// PUT /api/candidates - Update candidate
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.candidate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Candidate not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.phone !== undefined) data.phone = updates.phone || null;
    if (updates.stage !== undefined) data.stage = updates.stage;
    if (updates.rating !== undefined) data.rating = Number(updates.rating);
    if (updates.source !== undefined) data.source = updates.source;
    if (updates.appliedDate !== undefined) data.appliedDate = updates.appliedDate;
    if (updates.notes !== undefined) data.notes = updates.notes || null;
    if (updates.avatar !== undefined) data.avatar = updates.avatar || null;
    if (updates.resumeUrl !== undefined) data.resumeUrl = updates.resumeUrl || null;
    if (updates.interviewDate !== undefined) data.interviewDate = updates.interviewDate || null;
    if (updates.offerAmount !== undefined) data.offerAmount = updates.offerAmount != null ? Number(updates.offerAmount) : null;
    if (updates.rejectedReason !== undefined) data.rejectedReason = updates.rejectedReason || null;

    // If moving to HIRED, also update job posting status
    if (updates.stage === 'HIRED' && existing.stage !== 'HIRED') {
      await db.jobPosting.update({
        where: { id: existing.jobPostingId },
        data: { status: 'FILLED' },
      });
    }

    const candidate = await db.candidate.update({
      where: { id },
      data,
      include: {
        jobPosting: {
          select: { id: true, title: true, department: { select: { id: true, name: true } }, status: true },
        },
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    console.error('Candidates PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

// DELETE /api/candidates - Delete a candidate
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.candidate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Candidate not found' },
        { status: 404 }
      );
    }

    await db.candidate.delete({ where: { id } });

    // Decrement applicant count
    await db.jobPosting.update({
      where: { id: existing.jobPostingId },
      data: { applicantCount: { decrement: 1 } },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    console.error('Candidates DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete candidate' },
      { status: 500 }
    );
  }
}
