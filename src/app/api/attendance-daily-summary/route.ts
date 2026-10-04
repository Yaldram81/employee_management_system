import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/attendance-daily-summary — Daily work summary for the employee
export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

      const attendance = await db.attendance.findUnique({
        where: { userId_date: { userId: user.userId, date } },
      });

      if (!attendance) {
        return NextResponse.json({
          status: 'success',
          data: { date, hasRecord: false },
        });
      }

      const totalHours = attendance.totalHours ?? 0;
      const breakHours = attendance.breakMinutes / 60;
      const overtimeHours = attendance.overtimeHours ?? 0;
      const netWorkHours = Math.max(0, totalHours - breakHours);

      // Get shift for comparison
      const shift = await db.shift.findFirst({ where: { isDefault: true } });
      const standardHours = shift?.overtimeThreshold ?? 8;

      // Build human-readable summary
      const h = Math.floor(netWorkHours);
      const m = Math.round((netWorkHours - h) * 60);
      const breakH = Math.floor(breakHours);
      const breakM = Math.round((breakHours - breakH) * 60);
      const otH = Math.floor(overtimeHours);
      const otM = Math.round((overtimeHours - otH) * 60);

      let summaryText = `You worked ${h}h ${m}m today`;
      if (breakHours > 0) {
        summaryText += `, including ${breakH > 0 ? `${breakH}h ` : ''}${breakM}m break`;
      }
      if (overtimeHours > 0) {
        summaryText += `, ${otH > 0 ? `${otH}h ` : ''}${otM}m overtime`;
      }

      return NextResponse.json({
        status: 'success',
        data: {
          date,
          hasRecord: true,
          clockIn: attendance.firstIn,
          clockOut: attendance.lastOut,
          totalHours,
          breakMinutes: attendance.breakMinutes,
          breakHours,
          netWorkHours,
          overtimeHours,
          standardHours,
          isOvertime: overtimeHours > 0,
          isGeofenceOk: attendance.isGeofenceOk,
          locationName: attendance.locationName,
          workMode: attendance.workMode,
          status: attendance.status,
          summaryText,
        },
      });
    } catch (error) {
      console.error('Daily summary error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to get daily summary' },
        { status: 500 }
      );
    }
  });
}
