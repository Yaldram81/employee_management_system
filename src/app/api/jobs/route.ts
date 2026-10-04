import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/jobs - List all job postings with department info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};
    if (status) where.status = status.toUpperCase();
    if (departmentId) where.departmentId = departmentId;
    if (type) where.type = type.toUpperCase();

    const jobPostings = await db.jobPosting.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, color: true } },
        _count: { select: { candidates: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: jobPostings });
  } catch (error) {
    console.error('Jobs GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch job postings' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create new job posting
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      departmentId,
      type,
      status,
      salaryMin,
      salaryMax,
      location,
      experience,
      skills,
      description,
      imageUrl,
      postedDate,
      closingDate,
    } = body;

    if (!title) {
      return NextResponse.json(
        { status: 'error', message: 'Job title is required' },
        { status: 400 }
      );
    }

    const jobPosting = await db.jobPosting.create({
      data: {
        title,
        departmentId: departmentId || null,
        type: type || 'FULL_TIME',
        status: status || 'DRAFT',
        salaryMin: salaryMin != null ? Number(salaryMin) : null,
        salaryMax: salaryMax != null ? Number(salaryMax) : null,
        location: location || 'On-site',
        experience: experience || '',
        skills: skills ? JSON.stringify(skills) : '[]',
        description: description || null,
        imageUrl: imageUrl || null,
        postedDate: postedDate || null,
        closingDate: closingDate || null,
      },
      include: {
        department: { select: { id: true, name: true, color: true } },
        _count: { select: { candidates: true } },
      },
    });

    return NextResponse.json(
      { status: 'success', message: 'Job posting created successfully', data: jobPosting },
      { status: 201 }
    );
  } catch (error) {
    console.error('Jobs POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create job posting' },
      { status: 500 }
    );
  }
}

// PUT /api/jobs - Update job posting
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Job posting ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.jobPosting.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Job posting not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.departmentId !== undefined) data.departmentId = updates.departmentId || null;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.salaryMin !== undefined) data.salaryMin = updates.salaryMin != null ? Number(updates.salaryMin) : null;
    if (updates.salaryMax !== undefined) data.salaryMax = updates.salaryMax != null ? Number(updates.salaryMax) : null;
    if (updates.location !== undefined) data.location = updates.location;
    if (updates.experience !== undefined) data.experience = updates.experience;
    if (updates.skills !== undefined) data.skills = JSON.stringify(updates.skills);
    if (updates.description !== undefined) data.description = updates.description || null;
    if (updates.imageUrl !== undefined) data.imageUrl = updates.imageUrl || null;
    if (updates.postedDate !== undefined) data.postedDate = updates.postedDate || null;
    if (updates.closingDate !== undefined) data.closingDate = updates.closingDate || null;
    if (updates.applicantCount !== undefined) data.applicantCount = Number(updates.applicantCount);

    const jobPosting = await db.jobPosting.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true, color: true } },
        _count: { select: { candidates: true } },
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Job posting updated successfully',
      data: jobPosting,
    });
  } catch (error) {
    console.error('Jobs PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update job posting' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs - Delete a job posting
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Job posting ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.jobPosting.findUnique({
      where: { id },
      include: { _count: { select: { candidates: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Job posting not found' },
        { status: 404 }
      );
    }

    if (existing._count.candidates > 0) {
      return NextResponse.json(
        { status: 'error', message: `Cannot delete job posting with ${existing._count.candidates} candidate(s). Remove candidates first.` },
        { status: 409 }
      );
    }

    await db.jobPosting.delete({ where: { id } });

    return NextResponse.json({
      status: 'success',
      message: 'Job posting deleted successfully',
    });
  } catch (error) {
    console.error('Jobs DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete job posting' },
      { status: 500 }
    );
  }
}
