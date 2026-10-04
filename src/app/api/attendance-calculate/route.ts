import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

/**
 * Add minutes to a HH:MM time string and return HH:MM:SS
 */
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

/**
 * Read a setting from SystemSetting table, with fallback default
 */
async function getSetting(key: string, fallback: string): Promise<string> {
  try {
    const row = await db.systemSetting.findUnique({ where: { key } });
    if (row) {
      try { const parsed = JSON.parse(row.value); return String(parsed); } catch { return row.value; }
    }
  } catch { /* ignore */ }
  return fallback;
}

async function getSettingNumber(key: string, fallback: number): Promise<number> {
  try {
    const row = await db.systemSetting.findUnique({ where: { key } });
    if (row) {
      try { const parsed = JSON.parse(row.value); return Number(parsed) || fallback; } catch { return Number(row.value) || fallback; }
    }
  } catch { /* ignore */ }
  return fallback;
}

// POST /api/attendance-calculate — Trigger calculation for a specific date or date range
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async () => {
    try {
      const body = await request.json();
      const { date, startDate, endDate, userId: targetUserId } = body;

      if (!date && !startDate) {
        return NextResponse.json(
          { status: 'error', message: 'Either date or startDate is required' },
          { status: 400 }
        );
      }

      // Read settings from SystemSetting table
      const settingsWorkingHoursStart = await getSetting('workingHoursStart', '09:00');
      const settingsWorkingHoursEnd = await getSetting('workingHoursEnd', '17:00');
      const settingsLateThreshold = await getSettingNumber('lateThreshold', 15);
      const settingsOvertimeThreshold = await getSettingNumber('overtimeThreshold', 8);

      // Determine date range
      const effectiveStartDate = date || startDate!;
      const effectiveEndDate = date || endDate || startDate!;

      // Get the default shift, but use settings as fallback if no shift exists
      const defaultShift = await db.shift.findFirst({ where: { isDefault: true } });

      // Build effective shift config from shift or settings
      const shiftStart = defaultShift?.startTime || settingsWorkingHoursStart;
      const shiftGracePeriod = defaultShift?.gracePeriod ?? settingsLateThreshold;
      const shiftHalfDayMin = defaultShift?.halfDayMin ?? 4;
      const shiftOvertimeThreshold = defaultShift?.overtimeThreshold ?? settingsOvertimeThreshold;

      if (!defaultShift) {
        console.log('[attendance-calculate] No default shift found, using system settings:', {
          start: shiftStart, gracePeriod: shiftGracePeriod, overtimeThreshold: shiftOvertimeThreshold,
        });
      }

      // Find all distinct users who have attendance logs in the date range
      const dateFilter: Record<string, unknown> = {};
      if (effectiveStartDate === effectiveEndDate) {
        dateFilter.punchTime = {
          gte: new Date(`${effectiveStartDate}T00:00:00.000Z`),
          lte: new Date(`${effectiveStartDate}T23:59:59.999Z`),
        };
      } else {
        dateFilter.punchTime = {
          gte: new Date(`${effectiveStartDate}T00:00:00.000Z`),
          lte: new Date(`${effectiveEndDate}T23:59:59.999Z`),
        };
      }

      if (targetUserId) {
        dateFilter.userId = targetUserId;
      }

      const logsWithDates = await db.attendanceLog.findMany({
        where: dateFilter,
        select: { userId: true, punchTime: true },
        distinct: ['userId'],
      });

      const userIds = [...new Set(logsWithDates.map((l) => l.userId))];

      // Also find users who already have attendance records but no logs (e.g., ABSENT records)
      const existingAttendance = await db.attendance.findMany({
        where: {
          date: { gte: effectiveStartDate, lte: effectiveEndDate },
          ...(targetUserId && { userId: targetUserId }),
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      const allUserIds = [...new Set([...userIds, ...existingAttendance.map((a) => a.userId)])];

      // Generate all dates in the range
      const dates: string[] = [];
      const start = new Date(effectiveStartDate);
      const end = new Date(effectiveEndDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      const results: Array<{
        userId: string;
        date: string;
        status: string;
        firstIn: string | null;
        lastOut: string | null;
        totalHours: number | null;
        overtimeHours: number | null;
      }> = [];

      for (const uid of allUserIds) {
        for (const d of dates) {
          // Get all logs for this user on this date
          const dayStart = new Date(`${d}T00:00:00.000Z`);
          const dayEnd = new Date(`${d}T23:59:59.999Z`);

          const logs = await db.attendanceLog.findMany({
            where: {
              userId: uid,
              punchTime: { gte: dayStart, lte: dayEnd },
            },
            orderBy: { punchTime: 'asc' },
          });

          // Find earliest CLOCK_IN and latest CLOCK_OUT
          const clockIns = logs.filter((l) => l.punchType === 'CLOCK_IN');
          const clockOuts = logs.filter((l) => l.punchType === 'CLOCK_OUT');

          const earliestIn = clockIns.length > 0 ? clockIns[0] : null;
          const latestOut = clockOuts.length > 0 ? clockOuts[clockOuts.length - 1] : null;

          const firstIn = earliestIn
            ? `${String(earliestIn.punchTime.getUTCHours()).padStart(2, '0')}:${String(earliestIn.punchTime.getUTCMinutes()).padStart(2, '0')}:${String(earliestIn.punchTime.getUTCSeconds()).padStart(2, '0')}`
            : null;

          const lastOut = latestOut
            ? `${String(latestOut.punchTime.getUTCHours()).padStart(2, '0')}:${String(latestOut.punchTime.getUTCMinutes()).padStart(2, '0')}:${String(latestOut.punchTime.getUTCSeconds()).padStart(2, '0')}`
            : null;

          // Calculate total hours
          let totalHours: number | null = null;
          if (earliestIn && latestOut) {
            const diffMs = latestOut.punchTime.getTime() - earliestIn.punchTime.getTime();
            totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          }

          // Determine status using shift rules or system settings
          let status = 'ABSENT';
          if (firstIn && lastOut && totalHours !== null) {
            const shiftStartWithGrace = addMinutesToTime(shiftStart, shiftGracePeriod);
            if (firstIn > shiftStartWithGrace) {
              status = 'LATE';
            } else if (totalHours < shiftHalfDayMin) {
              status = 'HALF_DAY';
            } else {
              status = 'PRESENT';
            }
          } else if (firstIn && !lastOut) {
            // Clocked in but not out yet
            status = 'PRESENT';
          }

          // Calculate overtime
          let overtimeHours: number | null = null;
          if (totalHours !== null && totalHours > shiftOvertimeThreshold) {
            overtimeHours = Math.round((totalHours - shiftOvertimeThreshold) * 100) / 100;
          }

          // Determine primary method
          const methodSet = new Set(logs.map((l) => l.method));
          const primaryMethod = methodSet.has('FACE') ? 'FACE' : methodSet.has('PIN') ? 'PIN' : methodSet.has('WEB') ? 'WEB' : methodSet.has('MANUAL') ? 'MANUAL' : 'PIN';

          // Upsert the daily Attendance record
          await db.attendance.upsert({
            where: { userId_date: { userId: uid, date: d } },
            update: {
              firstIn,
              lastOut,
              totalHours,
              status,
              method: primaryMethod,
              overtimeHours,
            },
            create: {
              userId: uid,
              date: d,
              firstIn,
              lastOut,
              totalHours,
              status,
              method: primaryMethod,
              overtimeHours,
            },
          });

          results.push({
            userId: uid,
            date: d,
            status,
            firstIn,
            lastOut,
            totalHours,
            overtimeHours,
          });
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Attendance calculated for ${results.length} record(s)`,
        data: {
          dateRange: { startDate: effectiveStartDate, endDate: effectiveEndDate },
          totalRecords: results.length,
          summary: {
            PRESENT: results.filter((r) => r.status === 'PRESENT').length,
            LATE: results.filter((r) => r.status === 'LATE').length,
            ABSENT: results.filter((r) => r.status === 'ABSENT').length,
            HALF_DAY: results.filter((r) => r.status === 'HALF_DAY').length,
          },
          records: results,
        },
      });
    } catch (error) {
      console.error('AttendanceCalculate POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to calculate attendance' },
        { status: 500 }
      );
    }
  });
}
