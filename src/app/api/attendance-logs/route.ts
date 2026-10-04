import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, type AuthUser } from '@/lib/auth';
import { recalculateDailyAttendance } from '@/lib/attendance-utils';

const OFFICE_IP_NETWORK = '192.168.1';

// GET /api/attendance-logs — List attendance logs
export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
      const date = searchParams.get('date');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const punchType = searchParams.get('punchType');
      const method = searchParams.get('method');

      // Build where clause based on role
      const where: Record<string, unknown> = {};

      if (user.role.toLowerCase() === 'employee') {
        // Employees can only see their own logs
        where.userId = user.userId;
      } else if (user.role.toLowerCase() === 'manager') {
        // Managers can see their department's logs
        const managerUser = await db.user.findUnique({
          where: { id: user.userId },
          include: { managedDepartment: true },
        });
        if (managerUser?.managedDepartment) {
          where.user = { departmentId: managerUser.managedDepartment.id };
        } else {
          where.userId = user.userId;
        }
      }
      // Admin can see all — no filter

      // Apply query filters
      if (userId && user.role.toLowerCase() !== 'employee') {
        where.userId = userId;
      }
      if (punchType) where.punchType = punchType;
      if (method) where.method = method;

      // Date filtering on punchTime
      if (date) {
        where.punchTime = {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        };
      } else if (startDate && endDate) {
        where.punchTime = {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        };
      } else if (startDate) {
        where.punchTime = { gte: new Date(`${startDate}T00:00:00.000Z`) };
      } else if (endDate) {
        where.punchTime = { lte: new Date(`${endDate}T23:59:59.999Z`) };
      }

      const logs = await db.attendanceLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } },
          },
          editor: {
            select: { id: true, name: true },
          },
        },
        orderBy: { punchTime: 'desc' },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Attendance logs fetched successfully',
        data: logs,
      });
    } catch (error) {
      console.error('AttendanceLogs GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch attendance logs' },
        { status: 500 }
      );
    }
  });
}

// POST /api/attendance-logs — Create a punch record (clock in/out)
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user: AuthUser) => {
    try {
      const body = await request.json();
      let { userId, punchType, method, pinCode, confidence, gpsLatitude, gpsLongitude } = body;

      // Employees can only punch for themselves
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      if (!userId || !punchType || !method) {
        return NextResponse.json(
          { status: 'error', message: 'userId, punchType (CLOCK_IN/CLOCK_OUT), and method are required' },
          { status: 400 }
        );
      }

      if (!['CLOCK_IN', 'CLOCK_OUT'].includes(punchType)) {
        return NextResponse.json(
          { status: 'error', message: 'punchType must be CLOCK_IN or CLOCK_OUT' },
          { status: 400 }
        );
      }

      if (!['FACE', 'PIN', 'MANUAL', 'WEB'].includes(method)) {
        return NextResponse.json(
          { status: 'error', message: 'method must be FACE, PIN, MANUAL, or WEB' },
          { status: 400 }
        );
      }

      // Validate user exists
      const userRecord = await db.user.findUnique({ where: { id: userId } });
      if (!userRecord) {
        return NextResponse.json(
          { status: 'error', message: 'User not found' },
          { status: 404 }
        );
      }

      // Method-specific validation
      let editedBy: string | null = null;
      let isFlagged = false;
      let flagReason: string | null = null;
      let finalConfidence: number | null = confidence ?? null;
      let ipAddress: string | null = null;

      if (method === 'PIN') {
        // Validate PIN code
        if (!pinCode) {
          return NextResponse.json(
            { status: 'error', message: 'PIN code is required for PIN method' },
            { status: 400 }
          );
        }
        if (pinCode !== userRecord.pinCode) {
          return NextResponse.json(
            { status: 'error', message: 'Invalid PIN code' },
            { status: 401 }
          );
        }
      }

      if (method === 'MANUAL') {
        // Requires admin or manager role
        if (!['admin', 'manager'].includes(user.role.toLowerCase())) {
          return NextResponse.json(
            { status: 'error', message: 'MANUAL method requires admin or manager role' },
            { status: 403 }
          );
        }
        editedBy = user.userId;
      }

      if (method === 'FACE') {
        // Confidence is expected from face recognition
        if (!finalConfidence) {
          return NextResponse.json(
            { status: 'error', message: 'Confidence score is required for FACE method' },
            { status: 400 }
          );
        }
      }

      if (method === 'WEB') {
        // Capture IP from request headers
        const forwarded = request.headers.get('x-forwarded-for');
        ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;

        // Check against office network
        if (userRecord.workMode === 'OFFICE' && ipAddress) {
          if (!ipAddress.startsWith(OFFICE_IP_NETWORK)) {
            isFlagged = true;
            flagReason = 'IP_NOT_IN_OFFICE_NETWORK';
          }
        }
      }

      // Create the attendance log
      const now = new Date();
      const log = await db.attendanceLog.create({
        data: {
          userId,
          punchType,
          punchTime: now,
          method,
          confidence: finalConfidence,
          ipAddress,
          gpsLatitude: gpsLatitude ?? null,
          gpsLongitude: gpsLongitude ?? null,
          isFlagged,
          flagReason,
          editedBy,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } },
          },
          editor: {
            select: { id: true, name: true },
          },
        },
      });

      // Auto-calculate and update the daily Attendance record
      const today = now.toISOString().split('T')[0];
      const dailyAttendance = await recalculateDailyAttendance(userId, today);

      return NextResponse.json({
        status: 'success',
        message: `${punchType === 'CLOCK_IN' ? 'Clocked in' : 'Clocked out'} successfully${isFlagged ? ' (Flagged: ' + flagReason + ')' : ''}`,
        data: {
          log,
          dailyAttendance,
        },
      }, { status: 201 });
    } catch (error) {
      console.error('AttendanceLogs POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to record punch' },
        { status: 500 }
      );
    }
  });
}
