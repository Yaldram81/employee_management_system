import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/lifecycle-events - List events with user/department/approver info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const departmentId = searchParams.get('departmentId');

    const where: Record<string, unknown> = {};
    if (type) where.type = type.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (userId) where.userId = userId;
    if (departmentId) where.departmentId = departmentId;

    const events = await db.lifecycleEvent.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
        department: { select: { id: true, name: true, color: true } },
        approver: { select: { id: true, name: true, email: true, position: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ status: 'success', data: events });
  } catch (error) {
    console.error('Lifecycle Events GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch lifecycle events' },
      { status: 500 }
    );
  }
}

// POST /api/lifecycle-events - Create new event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      employeeName,
      email,
      departmentId,
      type,
      status,
      effectiveDate,
      details,
      fromValue,
      toValue,
      approvedById,
    } = body;

    if (!employeeName || !effectiveDate || !details) {
      return NextResponse.json(
        { status: 'error', message: 'Employee name, effective date, and details are required' },
        { status: 400 }
      );
    }

    const event = await db.lifecycleEvent.create({
      data: {
        userId: userId || null,
        employeeName,
        email: email || null,
        departmentId: departmentId || null,
        type: type || 'HIRE',
        status: status || 'PENDING',
        effectiveDate,
        details,
        fromValue: fromValue || null,
        toValue: toValue || null,
        approvedById: approvedById || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
        department: { select: { id: true, name: true, color: true } },
        approver: { select: { id: true, name: true, email: true, position: true } },
      },
    });

    return NextResponse.json(
      { status: 'success', message: 'Lifecycle event created successfully', data: event },
      { status: 201 }
    );
  } catch (error) {
    console.error('Lifecycle Events POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create lifecycle event' },
      { status: 500 }
    );
  }
}

// PUT /api/lifecycle-events - Update event (approve, reject, complete)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Event ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.lifecycleEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Lifecycle event not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.employeeName !== undefined) data.employeeName = updates.employeeName;
    if (updates.email !== undefined) data.email = updates.email || null;
    if (updates.departmentId !== undefined) data.departmentId = updates.departmentId || null;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.effectiveDate !== undefined) data.effectiveDate = updates.effectiveDate;
    if (updates.details !== undefined) data.details = updates.details;
    if (updates.fromValue !== undefined) data.fromValue = updates.fromValue || null;
    if (updates.toValue !== undefined) data.toValue = updates.toValue || null;
    if (updates.approvedById !== undefined) data.approvedById = updates.approvedById || null;

    // Set approvedAt when approving
    if (updates.status === 'APPROVED' && existing.status !== 'APPROVED') {
      data.approvedAt = new Date();
      if (updates.approvedById) {
        data.approvedById = updates.approvedById;
      }
    }

    // Set approvedAt when rejecting
    if (updates.status === 'REJECTED' && existing.status !== 'REJECTED') {
      data.approvedAt = new Date();
      if (updates.approvedById) {
        data.approvedById = updates.approvedById;
      }
    }

    // Set status to COMPLETED
    if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      data.status = 'COMPLETED';
    }

    const event = await db.lifecycleEvent.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
        department: { select: { id: true, name: true, color: true } },
        approver: { select: { id: true, name: true, email: true, position: true } },
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Lifecycle event updated successfully',
      data: event,
    });
  } catch (error) {
    console.error('Lifecycle Events PUT error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to update lifecycle event' },
      { status: 500 }
    );
  }
}

// DELETE /api/lifecycle-events - Delete an event
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'Event ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.lifecycleEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', message: 'Lifecycle event not found' },
        { status: 404 }
      );
    }

    await db.lifecycleEvent.delete({ where: { id } });

    return NextResponse.json({
      status: 'success',
      message: 'Lifecycle event deleted successfully',
    });
  } catch (error) {
    console.error('Lifecycle Events DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete lifecycle event' },
      { status: 500 }
    );
  }
}
