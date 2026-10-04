import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';

// GET /api/shifts — List all shifts with employee counts (any authenticated user)
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const shifts = await db.shift.findMany({
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });

      // Count users per shift separately
      const usersWithShifts = await db.user.findMany({
        where: { shiftId: { not: null } },
        select: { shiftId: true },
      });
      const countMap: Record<string, number> = {};
      for (const u of usersWithShifts) {
        if (u.shiftId) countMap[u.shiftId] = (countMap[u.shiftId] || 0) + 1;
      }

      const data = shifts.map(s => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        gracePeriod: s.gracePeriod,
        halfDayMin: s.halfDayMin,
        overtimeThreshold: s.overtimeThreshold,
        isDefault: s.isDefault,
        color: s.color,
        employeeCount: countMap[s.id] || 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

      return NextResponse.json({
        status: 'success',
        message: 'Shifts fetched successfully',
        data,
      });
    } catch (error) {
      console.error('Shifts GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch shifts' },
        { status: 500 }
      );
    }
  });
}

// POST /api/shifts — Create shift (admin only)
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { name, startTime, endTime, gracePeriod, halfDayMin, overtimeThreshold, isDefault, color } = body;

      if (!name || !startTime || !endTime) {
        return NextResponse.json(
          { status: 'error', message: 'Name, startTime, and endTime are required' },
          { status: 400 }
        );
      }

      // Validate time format (HH:MM)
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return NextResponse.json(
          { status: 'error', message: 'startTime and endTime must be in HH:MM format' },
          { status: 400 }
        );
      }

      // If setting as default, unset any existing default
      if (isDefault) {
        await db.shift.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const shift = await db.shift.create({
        data: {
          name,
          startTime,
          endTime,
          gracePeriod: gracePeriod ?? 15,
          halfDayMin: halfDayMin ?? 4.5,
          overtimeThreshold: overtimeThreshold ?? 9,
          isDefault: isDefault ?? false,
          color: color ?? '#10b981',
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Shift created successfully',
        data: shift,
      }, { status: 201 });
    } catch (error) {
      console.error('Shifts POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create shift' },
        { status: 500 }
      );
    }
  });
}

// PATCH /api/shifts — Update shift (admin only)
export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { id, name, startTime, endTime, gracePeriod, halfDayMin, overtimeThreshold, isDefault, color } = body;

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Shift ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.shift.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Shift not found' },
          { status: 404 }
        );
      }

      // Validate time format if provided
      const timeRegex = /^\d{2}:\d{2}$/;
      if (startTime && !timeRegex.test(startTime)) {
        return NextResponse.json(
          { status: 'error', message: 'startTime must be in HH:MM format' },
          { status: 400 }
        );
      }
      if (endTime && !timeRegex.test(endTime)) {
        return NextResponse.json(
          { status: 'error', message: 'endTime must be in HH:MM format' },
          { status: 400 }
        );
      }

      // If setting as default, unset any existing default
      if (isDefault) {
        await db.shift.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const shift = await db.shift.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(startTime !== undefined && { startTime }),
          ...(endTime !== undefined && { endTime }),
          ...(gracePeriod !== undefined && { gracePeriod }),
          ...(halfDayMin !== undefined && { halfDayMin }),
          ...(overtimeThreshold !== undefined && { overtimeThreshold }),
          ...(isDefault !== undefined && { isDefault }),
          ...(color !== undefined && { color }),
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Shift updated successfully',
        data: shift,
      });
    } catch (error) {
      console.error('Shifts PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update shift' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/shifts — Delete shift (admin only)
export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Shift ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.shift.findUnique({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Shift not found' },
          { status: 404 }
        );
      }

      if (existing.isDefault) {
        return NextResponse.json(
          { status: 'error', message: 'Cannot delete the default shift. Set another shift as default first.' },
          { status: 400 }
        );
      }

      // Unassign all employees from this shift before deleting
      await db.user.updateMany({
        where: { shiftId: id },
        data: { shiftId: null },
      });

      await db.shift.delete({ where: { id } });

      return NextResponse.json({
        status: 'success',
        message: 'Shift deleted successfully',
      });
    } catch (error) {
      console.error('Shifts DELETE error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to delete shift' },
        { status: 500 }
      );
    }
  });
}
