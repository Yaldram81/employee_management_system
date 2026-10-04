import { db } from '@/lib/db';

/**
 * Add minutes to a HH:MM time string and return HH:MM:SS
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

/**
 * Format a Date object to HH:MM:SS string
 */
export function formatTimeToHHMMSS(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

/**
 * Calculate and upsert the daily Attendance record for a user+date.
 * This is the core calculation engine that runs after every punch.
 */
export async function recalculateDailyAttendance(userId: string, date: string) {
  // 1. Get all attendance logs for this user on this date
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const logs = await db.attendanceLog.findMany({
    where: {
      userId,
      punchTime: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { punchTime: 'asc' },
  });

  // 2. Find earliest CLOCK_IN and latest CLOCK_OUT
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

  // 3. Calculate total hours
  let totalHours: number | null = null;
  if (earliestIn && latestOut) {
    const diffMs = latestOut.punchTime.getTime() - earliestIn.punchTime.getTime();
    totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  // 4. Get the default shift
  const shift = await db.shift.findFirst({ where: { isDefault: true } });

  // 5. Determine status
  let status = 'ABSENT';
  if (firstIn && lastOut && totalHours !== null && shift) {
    const shiftStartWithGrace = addMinutesToTime(shift.startTime, shift.gracePeriod);
    if (firstIn > shiftStartWithGrace) {
      status = 'LATE';
    } else if (totalHours < shift.halfDayMin) {
      status = 'HALF_DAY';
    } else {
      status = 'PRESENT';
    }
  } else if (firstIn && !lastOut) {
    status = 'PRESENT';
  }

  // 6. Calculate overtime
  let overtimeHours: number | null = null;
  if (totalHours !== null && shift && totalHours > shift.overtimeThreshold) {
    overtimeHours = Math.round((totalHours - shift.overtimeThreshold) * 100) / 100;
  }

  // 7. Determine primary method
  const methodSet = new Set(logs.map((l) => l.method));
  const primaryMethod = methodSet.has('FACE') ? 'FACE' : methodSet.has('PIN') ? 'PIN' : methodSet.has('WEB') ? 'WEB' : methodSet.has('MANUAL') ? 'MANUAL' : 'PIN';

  // 8. Upsert the daily Attendance record
  const attendance = await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: {
      firstIn,
      lastOut,
      totalHours,
      status,
      method: primaryMethod,
      overtimeHours,
    },
    create: {
      userId,
      date,
      firstIn,
      lastOut,
      totalHours,
      status,
      method: primaryMethod,
      overtimeHours,
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

  return attendance;
}
