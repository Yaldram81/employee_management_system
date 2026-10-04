import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// GET /api/leave-policies
export async function GET(request: NextRequest) {
  return requireRole(request, ['admin', 'manager', 'employee'], async () => {
    try {
      const policies = await db.leavePolicy.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
      return NextResponse.json({ status: 'success', data: policies });
    } catch (error) {
      console.error('LeavePolicies GET error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch leave policies' }, { status: 500 });
    }
  });
}

// POST /api/leave-policies — Create a new leave policy
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { name, type, annualQuota, requiresApproval, requiresDocument, documentThresholdDays,
        carriesForward, maxCarryForward, isEncashable, isPaid, color } = body;

      if (!name || !type) {
        return NextResponse.json({ status: 'error', message: 'Name and type are required' }, { status: 400 });
      }

      const policy = await db.leavePolicy.create({
        data: {
          name, type: type.toUpperCase(), annualQuota: annualQuota || 10,
          requiresApproval: requiresApproval !== false,
          requiresDocument: requiresDocument || false,
          documentThresholdDays: documentThresholdDays || 3,
          carriesForward: carriesForward || false,
          maxCarryForward: maxCarryForward || 0,
          isEncashable: isEncashable || false,
          isPaid: isPaid !== false,
          color: color || '#10b981',
        },
      });

      return NextResponse.json({ status: 'success', message: 'Leave policy created', data: policy }, { status: 201 });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message?.includes('Unique') || error.message?.includes('unique'))) {
        return NextResponse.json({ status: 'error', message: 'A policy with this name already exists. Please use a different name.' }, { status: 409 });
      }
      console.error('LeavePolicy POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to create leave policy' }, { status: 500 });
    }
  });
}

// PATCH /api/leave-policies — Update a leave policy
export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { id, ...updates } = body;
      if (!id) return NextResponse.json({ status: 'error', message: 'Policy ID is required' }, { status: 400 });

      // Convert boolean fields
      if (updates.requiresApproval !== undefined) updates.requiresApproval = !!updates.requiresApproval;
      if (updates.requiresDocument !== undefined) updates.requiresDocument = !!updates.requiresDocument;
      if (updates.carriesForward !== undefined) updates.carriesForward = !!updates.carriesForward;
      if (updates.isEncashable !== undefined) updates.isEncashable = !!updates.isEncashable;
      if (updates.isPaid !== undefined) updates.isPaid = !!updates.isPaid;
      if (updates.type) updates.type = updates.type.toUpperCase();

      const updated = await db.leavePolicy.update({ where: { id }, data: updates });
      return NextResponse.json({ status: 'success', message: 'Leave policy updated', data: updated });
    } catch (error) {
      console.error('LeavePolicy PATCH error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to update leave policy' }, { status: 500 });
    }
  });
}

// DELETE /api/leave-policies — Soft-delete (deactivate) a leave policy
export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ status: 'error', message: 'Policy ID is required' }, { status: 400 });

      await db.leavePolicy.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ status: 'success', message: 'Leave policy deactivated' });
    } catch (error) {
      console.error('LeavePolicy DELETE error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to delete leave policy' }, { status: 500 });
    }
  });
}
