import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { recalculateDailyAttendance } from '@/lib/attendance-utils';

// ─── Haversine distance (meters) ────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Check GPS against all active geofences ─────────────────────
async function checkGeofence(lat: number, lng: number): Promise<{
  isInside: boolean;
  nearestGeofence: { name: string; distance: number } | null;
}> {
  const geofences = await db.officeGeofence.findMany({ where: { isActive: true } });

  if (geofences.length === 0) {
    // No geofences configured — default to HQ (Karachi, Pakistan demo)
    const HQ_LAT = 24.8607;
    const HQ_LNG = 67.0011;
    const HQ_RADIUS = 500;
    const dist = haversineDistance(lat, lng, HQ_LAT, HQ_LNG);
    return {
      isInside: dist <= HQ_RADIUS,
      nearestGeofence: { name: 'Main Office (Default)', distance: Math.round(dist) },
    };
  }

  let nearest: { name: string; distance: number } | null = null;
  let isInside = false;

  for (const gf of geofences) {
    const dist = haversineDistance(lat, lng, gf.latitude, gf.longitude);
    if (dist <= gf.radiusMeters) {
      isInside = true;
      nearest = { name: gf.name, distance: Math.round(dist) };
      break;
    }
    if (!nearest || dist < nearest.distance) {
      nearest = { name: gf.name, distance: Math.round(dist) };
    }
  }

  return { isInside, nearestGeofence: nearest };
}

// ─── Determine location name from GPS ───────────────────────────
function inferLocationName(isInside: boolean, geofenceName: string | undefined, workMode: string): string {
  if (isInside) return geofenceName || 'Office';
  if (workMode === 'REMOTE') return 'Home (Remote)';
  if (workMode === 'HYBRID') return 'Off-site (Hybrid)';
  return 'Unknown Location';
}

// ─── Infer work mode from GPS ───────────────────────────────────
function inferWorkMode(isInside: boolean, currentWorkMode: string): string {
  if (isInside) return 'OFFICE';
  if (currentWorkMode === 'REMOTE' || currentWorkMode === 'HYBRID') return currentWorkMode;
  return 'REMOTE'; // Outside geofence with no explicit remote mode → suggest remote
}

// GET /api/attendance — List daily attendance records (enriched with totalHours, overtimeHours)
export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      let userId = searchParams.get('userId');
      const date = searchParams.get('date');
      const departmentId = searchParams.get('departmentId');
      const status = searchParams.get('status');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Employees can only see their own attendance
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;
      if (date) where.date = date;
      if (status) where.status = status;
      if (startDate && endDate) {
        where.date = { gte: startDate, lte: endDate };
      } else if (startDate) {
        where.date = { gte: startDate };
      } else if (endDate) {
        where.date = { lte: endDate };
      }

      if (departmentId) {
        where.user = { departmentId };
      }

      // For managers, restrict to their department
      if (user.role.toLowerCase() === 'manager' && !departmentId) {
        const managerUser = await db.user.findUnique({
          where: { id: user.userId },
          include: { managedDepartment: true },
        });
        if (managerUser?.managedDepartment) {
          where.user = { departmentId: managerUser.managedDepartment.id };
        }
      }

      const attendance = await db.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              workMode: true,
              department: { select: { id: true, name: true } },
            },
          },
          editor: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
      });

      // Enrich with additional computed fields
      const enriched = attendance.map((record) => ({
        ...record,
        // Add computed display fields
        clockIn: record.firstIn, // Backward compat
        clockOut: record.lastOut, // Backward compat
        isOvertime: record.overtimeHours !== null && record.overtimeHours > 0,
        isHalfDay: record.status === 'HALF_DAY',
        isLate: record.status === 'LATE',
        breakHours: record.breakMinutes ? record.breakMinutes / 60 : 0,
        netWorkHours: record.totalHours != null && record.breakMinutes
          ? Math.max(0, record.totalHours - record.breakMinutes / 60)
          : record.totalHours ?? 0,
      }));

      return NextResponse.json({
        status: 'success',
        message: 'Attendance fetched successfully',
        data: enriched,
      });
    } catch (error) {
      console.error('Attendance GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch attendance' },
        { status: 500 }
      );
    }
  });
}

// POST /api/attendance — Clock in/out/break using the dual-table architecture
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      let { userId, method, note, pinCode, gpsLatitude, gpsLongitude, gpsAccuracy, punchType: requestedPunchType } = body;

      // Employees can only clock in/out for themselves
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      if (!userId) {
        return NextResponse.json(
          { status: 'error', message: 'User ID is required' },
          { status: 400 }
        );
      }

      const userRecord = await db.user.findUnique({ where: { id: userId } });
      if (!userRecord) {
        return NextResponse.json(
          { status: 'error', message: 'User not found' },
          { status: 404 }
        );
      }

      // Validate PIN if method is PIN
      if (method === 'PIN' && pinCode && pinCode !== userRecord.pinCode) {
        return NextResponse.json(
          { status: 'error', message: 'Invalid PIN code' },
          { status: 401 }
        );
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      // ─── GPS / Geofence processing ──────────────────────────
      let isGeofenceOk: boolean | null = null;
      let locationName: string | null = null;
      let detectedWorkMode: string | null = null;
      let geofenceDistance: number | null = null;

      if (gpsLatitude != null && gpsLongitude != null) {
        const geofenceResult = await checkGeofence(gpsLatitude, gpsLongitude);
        isGeofenceOk = geofenceResult.isInside;
        locationName = inferLocationName(
          geofenceResult.isInside,
          geofenceResult.nearestGeofence?.name,
          userRecord.workMode || 'OFFICE',
        );
        detectedWorkMode = inferWorkMode(geofenceResult.isInside, userRecord.workMode || 'OFFICE');
        geofenceDistance = geofenceResult.nearestGeofence?.distance ?? null;
      }

      // ─── Determine punch type ───────────────────────────────
      const todayStart = new Date(`${today}T00:00:00.000Z`);
      const todayEnd = new Date(`${today}T23:59:59.999Z`);

      const todayLogs = await db.attendanceLog.findMany({
        where: {
          userId,
          punchTime: { gte: todayStart, lte: todayEnd },
          isBreak: false,
        },
        orderBy: { punchTime: 'desc' },
      });

      let punchType: string;
      let isBreakPunch = false;

      if (requestedPunchType === 'BREAK_START' || requestedPunchType === 'BREAK_END') {
        punchType = requestedPunchType;
        isBreakPunch = true;
      } else {
        // Auto-determine: if no clock-in today or last non-break punch was CLOCK_OUT, then CLOCK_IN
        const lastPunch = todayLogs[0];
        punchType = (!lastPunch || lastPunch.punchType === 'CLOCK_OUT')
          ? 'CLOCK_IN'
          : 'CLOCK_OUT';
      }

      // ─── Capture IP address ─────────────────────────────────
      const forwarded = request.headers.get('x-forwarded-for');
      const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;

      // ─── Flag logic ─────────────────────────────────────────
      let isFlagged = false;
      let flagReason: string | null = null;

      if (!isBreakPunch) {
        // Check if IP is in office network for OFFICE mode users
        if (userRecord.workMode === 'OFFICE' && ipAddress && !ipAddress.startsWith('192.168.1')) {
          isFlagged = true;
          flagReason = 'IP_NOT_IN_OFFICE_NETWORK';
        }
        // Check geofence
        if (isGeofenceOk === false && punchType === 'CLOCK_IN') {
          isFlagged = true;
          flagReason = 'OUTSIDE_GEOFENCE';
        }
      }

      // ─── Create the attendance log (raw punch) ──────────────
      const log = await db.attendanceLog.create({
        data: {
          userId,
          punchType,
          punchTime: now,
          method: method || 'WEB',
          ipAddress,
          gpsLatitude: gpsLatitude ?? null,
          gpsLongitude: gpsLongitude ?? null,
          gpsAccuracy: gpsAccuracy ?? null,
          locationName,
          isFlagged,
          flagReason,
          isBreak: isBreakPunch,
        },
      });

      // ─── Update daily Attendance record ─────────────────────
      if (!isBreakPunch) {
        // Auto-calculate and update the daily Attendance record
        const dailyAttendance = await recalculateDailyAttendance(userId, today);

        // Update GPS/geofence/workMode on the attendance record for clock-in
        if (punchType === 'CLOCK_IN' && gpsLatitude != null && gpsLongitude != null) {
          await db.attendance.update({
            where: { userId_date: { userId, date: today } },
            data: {
              gpsLatitude,
              gpsLongitude,
              locationName,
              isGeofenceOk,
              workMode: detectedWorkMode || userRecord.workMode || 'OFFICE',
            },
          });
        }

        // Add note if provided
        if (note) {
          await db.attendance.update({
            where: { userId_date: { userId, date: today } },
            data: { note },
          });
        }
      } else {
        // Break punch — recalculate break minutes
        await recalculateBreakMinutes(userId, today);
      }

      // ─── Fetch final attendance ─────────────────────────────
      const finalAttendance = await db.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              workMode: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      });

      // ─── Build response message ─────────────────────────────
      let message = '';
      if (punchType === 'CLOCK_IN') {
        message = `Clocked in successfully${finalAttendance?.status === 'LATE' ? ' (Late)' : ''}`;
        if (isGeofenceOk === true) message += ` · 📍 ${locationName}`;
        else if (isGeofenceOk === false) message += ` · ⚠️ Outside geofence (${geofenceDistance}m away)`;
        if (detectedWorkMode && detectedWorkMode !== userRecord.workMode) {
          message += ` · Suggest: ${detectedWorkMode} mode`;
        }
      } else if (punchType === 'CLOCK_OUT') {
        message = 'Clocked out successfully';
        // Add daily summary
        if (finalAttendance) {
          const totalH = finalAttendance.totalHours ?? 0;
          const breakH = finalAttendance.breakMinutes / 60;
          const otH = finalAttendance.overtimeHours ?? 0;
          const netH = totalH - breakH;
          const h = Math.floor(netH);
          const m = Math.round((netH - h) * 60);
          message += ` · You worked ${h}h ${m}m today`;
          if (breakH > 0) message += `, including ${breakH.toFixed(1)}h break`;
          if (otH > 0) message += `, ${otH.toFixed(1)}h overtime`;
        }
      } else if (punchType === 'BREAK_START') {
        message = 'Break started · ⏸️ Timer paused';
      } else if (punchType === 'BREAK_END') {
        message = 'Break ended · ▶️ Timer resumed';
      }
      if (isFlagged) message += ` (Flagged: ${flagReason})`;

      return NextResponse.json({
        status: 'success',
        message,
        data: {
          punchType,
          log,
          dailyAttendance: finalAttendance,
          geofence: isGeofenceOk != null ? {
            isInside: isGeofenceOk,
            locationName,
            distance: geofenceDistance,
            detectedWorkMode,
          } : null,
        },
      });
    } catch (error) {
      console.error('Attendance POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to record attendance' },
        { status: 500 }
      );
    }
  });
}

// ─── Recalculate break minutes from break logs ──────────────────
async function recalculateBreakMinutes(userId: string, date: string) {
  const todayStart = new Date(`${date}T00:00:00.000Z`);
  const todayEnd = new Date(`${date}T23:59:59.999Z`);

  const breakLogs = await db.attendanceLog.findMany({
    where: {
      userId,
      punchTime: { gte: todayStart, lte: todayEnd },
      isBreak: true,
    },
    orderBy: { punchTime: 'asc' },
  });

  let totalBreakMinutes = 0;
  let breakStartTime: Date | null = null;

  for (const log of breakLogs) {
    if (log.punchType === 'BREAK_START') {
      breakStartTime = log.punchTime;
    } else if (log.punchType === 'BREAK_END' && breakStartTime) {
      const diffMs = log.punchTime.getTime() - breakStartTime.getTime();
      totalBreakMinutes += Math.round(diffMs / (1000 * 60));
      breakStartTime = null;
    }
  }

  // If currently on break (BREAK_START without BREAK_END), count up to now
  if (breakStartTime) {
    const diffMs = Date.now() - breakStartTime.getTime();
    totalBreakMinutes += Math.round(diffMs / (1000 * 60));
  }

  await db.attendance.update({
    where: { userId_date: { userId, date } },
    data: { breakMinutes: totalBreakMinutes },
  });
}

// PATCH /api/attendance — Manually edit attendance records (admin/manager only)
export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (user) => {
    try {
      const body = await request.json();
      const { id, firstIn, lastOut, status, totalHours, overtimeHours, note, method, breakMinutes, workMode, isGeofenceOk } = body;

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Attendance record ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.attendance.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Attendance record not found' },
          { status: 404 }
        );
      }

      // Managers can only edit their own department's attendance
      if (user.role.toLowerCase() === 'manager') {
        const managerUser = await db.user.findUnique({
          where: { id: user.userId },
          include: { managedDepartment: true },
        });
        if (managerUser?.managedDepartment && existing.user.departmentId !== managerUser.managedDepartment.id) {
          return NextResponse.json(
            { status: 'error', message: 'You can only edit attendance for your department' },
            { status: 403 }
          );
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        isEdited: true,
        editedBy: user.userId,
        editedAt: new Date(),
      };

      if (firstIn !== undefined) updateData.firstIn = firstIn;
      if (lastOut !== undefined) updateData.lastOut = lastOut;
      if (status !== undefined) updateData.status = status;
      if (totalHours !== undefined) updateData.totalHours = totalHours;
      if (overtimeHours !== undefined) updateData.overtimeHours = overtimeHours;
      if (note !== undefined) updateData.note = note;
      if (method !== undefined) updateData.method = method;
      if (breakMinutes !== undefined) updateData.breakMinutes = breakMinutes;
      if (workMode !== undefined) updateData.workMode = workMode;
      if (isGeofenceOk !== undefined) updateData.isGeofenceOk = isGeofenceOk;

      // Recalculate totalHours if firstIn and lastOut are both provided
      if (firstIn && lastOut) {
        const [inH, inM] = firstIn.split(':').map(Number);
        const [outH, outM] = lastOut.split(':').map(Number);
        const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        const calculatedHours = Math.round((totalMinutes / 60) * 100) / 100;
        updateData.totalHours = calculatedHours;

        // Also recalculate overtime
        const shift = await db.shift.findFirst({ where: { isDefault: true } });
        if (shift && calculatedHours > shift.overtimeThreshold) {
          updateData.overtimeHours = Math.round((calculatedHours - shift.overtimeThreshold) * 100) / 100;
        } else {
          updateData.overtimeHours = null;
        }
      }

      const updated = await db.attendance.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              workMode: true,
              department: { select: { id: true, name: true } },
            },
          },
          editor: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Attendance record updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Attendance PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update attendance record' },
        { status: 500 }
      );
    }
  });
}
