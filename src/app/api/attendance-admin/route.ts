import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { recalculateDailyAttendance } from '@/lib/attendance-utils';

// POST /api/attendance-admin — Admin-specific attendance actions
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { action } = body;

      switch (action) {
        case 'ghost-clock-out': {
          const { defaultTime, date } = body;
          const targetDate = date || new Date().toISOString().split('T')[0];
          const outTime = defaultTime || '17:00';

          const openRecords = await db.attendance.findMany({
            where: {
              date: targetDate,
              firstIn: { not: null },
              lastOut: null,
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
          });

          let resolvedCount = 0;
          const errors: string[] = [];

          for (const record of openRecords) {
            try {
              await db.attendanceLog.create({
                data: {
                  userId: record.userId,
                  punchType: 'CLOCK_OUT',
                  punchTime: new Date(`${targetDate}T${outTime}:00`),
                  method: 'MANUAL',
                  editedBy: user.userId,
                },
              });

              await recalculateDailyAttendance(record.userId, targetDate);

              await db.attendance.update({
                where: { id: record.id },
                data: {
                  isEdited: true,
                  editedBy: user.userId,
                  editedAt: new Date(),
                  note: `Ghost clock-out at ${outTime} by admin`,
                },
              });

              resolvedCount++;
            } catch (err) {
              errors.push(`Failed for ${record.user?.name || record.userId}`);
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `Ghost clock-out: ${resolvedCount}/${openRecords.length} resolved.`,
            data: { resolvedCount, totalOpen: openRecords.length, errors },
          });
        }

        case 'resolve-missed-punch': {
          const { userId, punchType, time, date: targetDate, note: punchNote } = body;
          const dateStr = targetDate || new Date().toISOString().split('T')[0];

          if (!userId || !punchType || !time) {
            return NextResponse.json(
              { status: 'error', message: 'userId, punchType, and time are required' },
              { status: 400 }
            );
          }

          const log = await db.attendanceLog.create({
            data: {
              userId,
              punchType: punchType.toUpperCase() === 'CLOCK_IN' ? 'CLOCK_IN' : 'CLOCK_OUT',
              punchTime: new Date(`${dateStr}T${time}:00`),
              method: 'MANUAL',
              editedBy: user.userId,
            },
          });

          await recalculateDailyAttendance(userId, dateStr);

          await db.attendance.update({
            where: { userId_date: { userId, date: dateStr } },
            data: {
              isEdited: true,
              editedBy: user.userId,
              editedAt: new Date(),
              note: punchNote || `Manual ${punchType} resolved by admin`,
            },
          });

          return NextResponse.json({
            status: 'success',
            message: 'Missed punch resolved',
            data: { log },
          });
        }

        case 'anomalies': {
          const { date: anomalyDate } = body;
          const dateStr = anomalyDate || new Date().toISOString().split('T')[0];

          const activeUsers = await db.user.findMany({
            where: { isActive: true },
            include: { department: { select: { name: true } } },
          });

          const todayAttendance = await db.attendance.findMany({
            where: { date: dateStr },
            include: {
              user: { select: { id: true, name: true, workMode: true, department: { select: { name: true } } } },
              editor: { select: { name: true } },
            },
          });

          const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
          const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
          const todayLogs = await db.attendanceLog.findMany({
            where: { punchTime: { gte: dayStart, lte: dayEnd } },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
            orderBy: { punchTime: 'desc' },
          });

          const todayLeaves = await db.leave.findMany({
            where: {
              startDate: { lte: dateStr },
              endDate: { gte: dateStr },
              status: 'APPROVED',
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
          });

          const usersOnLeave = new Set(todayLeaves.map(l => l.userId));

          // Anomalies
          const missedPunches = todayAttendance
            .filter(a => a.firstIn && !a.lastOut)
            .map(a => ({
              userId: a.userId,
              userName: a.user?.name || 'Unknown',
              department: a.user?.department?.name || 'N/A',
              firstIn: a.firstIn,
              attendanceId: a.id,
              type: 'missed-clock-out' as const,
            }));

          const flaggedLogs = todayLogs.filter(l => l.isFlagged).map(l => ({
            userId: l.userId,
            userName: l.user?.name || 'Unknown',
            department: l.user?.department?.name || 'N/A',
            method: l.method,
            ipAddress: l.ipAddress,
            flagReason: l.flagReason,
            logId: l.id,
            type: 'ip-mismatch' as const,
          }));

          // Rule violations: late 3+ times this week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
          const weekStartStr = weekStart.toISOString().split('T')[0];

          const weekAttendance = await db.attendance.findMany({
            where: {
              date: { gte: weekStartStr, lte: dateStr },
              status: 'LATE',
            },
          });

          const lateCountsByUser: Record<string, number> = {};
          for (const a of weekAttendance) {
            lateCountsByUser[a.userId] = (lateCountsByUser[a.userId] || 0) + 1;
          }

          const ruleViolations = Object.entries(lateCountsByUser)
            .filter(([_, count]) => count >= 3)
            .map(([uId, count]) => {
              const u = activeUsers.find(u => u.id === uId);
              return {
                userId: uId,
                userName: u?.name || 'Unknown',
                department: u?.department?.name || 'N/A',
                lateCount: count,
                type: 'rule-violation' as const,
              };
            });

          // Summary metrics
          const totalWorkforce = activeUsers.length;
          const presentToday = todayAttendance.filter(a => a.status === 'PRESENT').length;
          const lateToday = todayAttendance.filter(a => a.status === 'LATE').length;
          const onLeaveToday = usersOnLeave.size;
          const checkedIn = todayAttendance.filter(a => a.firstIn).length;

          const attendanceRate = (totalWorkforce - onLeaveToday) > 0
            ? Math.round(((presentToday + lateToday) / (totalWorkforce - onLeaveToday)) * 100)
            : 0;

          // Sparkline data for each user (last 5 working days)
          const sparklineDates: string[] = [];
          for (let i = 7; i >= 1; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              sparklineDates.push(d.toISOString().split('T')[0]);
            }
          }
          // Keep last 5
          const last5Dates = sparklineDates.slice(-5);

          // Fetch attendance for sparkline period
          const sparklineAttendance = await db.attendance.findMany({
            where: {
              date: { in: last5Dates },
            },
            select: {
              userId: true,
              date: true,
              totalHours: true,
              status: true,
            },
          });

          // Build universal roster
          const roster = activeUsers.map(u => {
            const todayRecord = todayAttendance.find(a => a.userId === u.id);
            const userLogs = todayLogs.filter(l => l.userId === u.id);
            const hasClockedIn = !!(todayRecord?.firstIn);
            const hasClockedOut = !!(todayRecord?.lastOut);
            const isOnLeave = usersOnLeave.has(u.id);
            const isFlagged = userLogs.some(l => l.isFlagged);

            let status: string;
            if (isOnLeave) {
              status = 'on-leave';
            } else if (isFlagged) {
              status = 'flagged';
            } else if (hasClockedIn && !hasClockedOut) {
              status = 'in-office';
            } else if (hasClockedIn && hasClockedOut) {
              status = 'left';
            } else if (todayRecord?.status === 'LATE') {
              status = 'late';
            } else if (!hasClockedIn && !isOnLeave) {
              status = 'not-arrived';
            } else {
              status = 'absent';
            }

            // Build sparkline
            const userSparkline = last5Dates.map(d => {
              const rec = sparklineAttendance.find(a => a.userId === u.id && a.date === d);
              return rec?.totalHours || 0;
            });

            // Get today's detailed punch log for this user
            const userTodayLogs = userLogs.map(l => ({
              id: l.id,
              punchType: l.punchType,
              punchTime: l.punchTime,
              method: l.method,
              confidence: l.confidence,
              ipAddress: l.ipAddress,
              isFlagged: l.isFlagged,
              flagReason: l.flagReason,
              editedBy: l.editedBy,
            }));

            return {
              userId: u.id,
              userName: u.name,
              email: u.email,
              department: u.department?.name || 'N/A',
              departmentId: u.departmentId,
              avatar: u.avatarUrl,
              workMode: u.workMode?.toLowerCase() || 'office',
              status,
              firstIn: todayRecord?.firstIn || null,
              lastOut: todayRecord?.lastOut || null,
              totalHours: todayRecord?.totalHours || null,
              overtimeHours: todayRecord?.overtimeHours || null,
              isEdited: todayRecord?.isEdited || false,
              editedBy: todayRecord?.editor?.name || null,
              isFlagged,
              attendanceId: todayRecord?.id || null,
              sparklineData: userSparkline,
              punchLogs: userTodayLogs,
            };
          });

          // Employee year heatmap data (for drawer)
          const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
          const yearAttendance = await db.attendance.findMany({
            where: { date: { gte: yearStart, lte: dateStr } },
            select: {
              userId: true,
              date: true,
              status: true,
              firstIn: true,
              lastOut: true,
              totalHours: true,
              isEdited: true,
              editedBy: true,
              note: true,
            },
          });

          // Build per-employee yearly map
          const employeeYearMap: Record<string, Array<{
            date: string;
            status: string;
            firstIn: string | null;
            lastOut: string | null;
            totalHours: number | null;
            isEdited: boolean;
            editedBy: string | null;
            note: string | null;
          }>> = {};

          for (const a of yearAttendance) {
            if (!employeeYearMap[a.userId]) employeeYearMap[a.userId] = [];
            employeeYearMap[a.userId].push({
              date: a.date,
              status: a.status,
              firstIn: a.firstIn,
              lastOut: a.lastOut,
              totalHours: a.totalHours,
              isEdited: a.isEdited,
              editedBy: a.editedBy,
              note: a.note,
            });
          }

          return NextResponse.json({
            status: 'success',
            message: 'Admin attendance data fetched',
            data: {
              date: dateStr,
              metrics: {
                totalWorkforce,
                presentToday,
                lateToday,
                onLeaveToday,
                checkedIn,
                attendanceRate,
              },
              anomalies: {
                missedPunches,
                ipMismatches: flaggedLogs,
                ruleViolations,
              },
              roster,
              employeeYearMap,
              todayLogs: todayLogs.map(l => ({
                id: l.id,
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                punchType: l.punchType,
                punchTime: l.punchTime,
                method: l.method,
                confidence: l.confidence,
                ipAddress: l.ipAddress,
                isFlagged: l.isFlagged,
                flagReason: l.flagReason,
                editedBy: l.editedBy,
              })),
              todayLeaves: todayLeaves.map(l => ({
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
              })),
            },
          });
        }

        case 'manual-attendance': {
          const { userId: maUserId, status: maStatus, clockIn: maClockIn, clockOut: maClockOut, note: maNote, date: maDate } = body;
          const maDateStr = maDate || new Date().toISOString().split('T')[0];

          if (!maUserId || !maStatus) {
            return NextResponse.json(
              { status: 'error', message: 'userId and status are required' },
              { status: 400 }
            );
          }

          const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'];
          const normalizedStatus = maStatus.toUpperCase();
          if (!validStatuses.includes(normalizedStatus)) {
            return NextResponse.json(
              { status: 'error', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
              { status: 400 }
            );
          }

          // Build attendance data
          const attendanceData: Record<string, unknown> = {
            status: normalizedStatus,
            isEdited: true,
            editedBy: user.userId,
            editedAt: new Date(),
            note: maNote || `Manual attendance: ${normalizedStatus} by admin`,
            method: 'MANUAL',
          };

          if (maClockIn) {
            attendanceData.firstIn = maClockIn.length === 5 ? `${maClockIn}:00` : maClockIn;
          }
          if (maClockOut) {
            attendanceData.lastOut = maClockOut.length === 5 ? `${maClockOut}:00` : maClockOut;
          }

          // Calculate totalHours and overtimeHours if both times provided
          if (maClockIn && maClockOut) {
            const [inH, inM] = maClockIn.split(':').map(Number);
            const [outH, outM] = maClockOut.split(':').map(Number);
            const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
            const calculatedHours = Math.round((totalMinutes / 60) * 100) / 100;
            attendanceData.totalHours = calculatedHours;

            const shift = await db.shift.findFirst({ where: { isDefault: true } });
            if (shift && calculatedHours > shift.overtimeThreshold) {
              attendanceData.overtimeHours = Math.round((calculatedHours - shift.overtimeThreshold) * 100) / 100;
            } else {
              attendanceData.overtimeHours = null;
            }
          }

          // Upsert attendance record
          const attendance = await db.attendance.upsert({
            where: { userId_date: { userId: maUserId, date: maDateStr } },
            update: attendanceData,
            create: {
              userId: maUserId,
              date: maDateStr,
              ...attendanceData,
            },
          });

          // Create attendance log entries
          if (maClockIn) {
            await db.attendanceLog.create({
              data: {
                userId: maUserId,
                punchType: 'CLOCK_IN',
                punchTime: new Date(`${maDateStr}T${maClockIn.length === 5 ? maClockIn + ':00' : maClockIn}`),
                method: 'MANUAL',
                editedBy: user.userId,
              },
            });
          }
          if (maClockOut) {
            await db.attendanceLog.create({
              data: {
                userId: maUserId,
                punchType: 'CLOCK_OUT',
                punchTime: new Date(`${maDateStr}T${maClockOut.length === 5 ? maClockOut + ':00' : maClockOut}`),
                method: 'MANUAL',
                editedBy: user.userId,
              },
            });
          }

          return NextResponse.json({
            status: 'success',
            message: `Manual attendance marked for user`,
            data: { attendance },
          });
        }

        case 'bulk-manual-attendance': {
          const { userIds: bmaUserIds, status: bmaStatus, clockIn: bmaClockIn, clockOut: bmaClockOut, note: bmaNote, date: bmaDate } = body;
          const bmaDateStr = bmaDate || new Date().toISOString().split('T')[0];

          if (!bmaUserIds || !Array.isArray(bmaUserIds) || bmaUserIds.length === 0 || !bmaStatus) {
            return NextResponse.json(
              { status: 'error', message: 'userIds (non-empty array) and status are required' },
              { status: 400 }
            );
          }

          const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'];
          const normalizedStatus = bmaStatus.toUpperCase();
          if (!validStatuses.includes(normalizedStatus)) {
            return NextResponse.json(
              { status: 'error', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
              { status: 400 }
            );
          }

          let successCount = 0;
          let failCount = 0;
          const errors: string[] = [];

          for (const uid of bmaUserIds) {
            try {
              const attendanceData: Record<string, unknown> = {
                status: normalizedStatus,
                isEdited: true,
                editedBy: user.userId,
                editedAt: new Date(),
                note: bmaNote || `Bulk manual attendance: ${normalizedStatus} by admin`,
                method: 'MANUAL',
              };

              if (bmaClockIn) {
                attendanceData.firstIn = bmaClockIn.length === 5 ? `${bmaClockIn}:00` : bmaClockIn;
              }
              if (bmaClockOut) {
                attendanceData.lastOut = bmaClockOut.length === 5 ? `${bmaClockOut}:00` : bmaClockOut;
              }

              if (bmaClockIn && bmaClockOut) {
                const [inH, inM] = bmaClockIn.split(':').map(Number);
                const [outH, outM] = bmaClockOut.split(':').map(Number);
                const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
                const calculatedHours = Math.round((totalMinutes / 60) * 100) / 100;
                attendanceData.totalHours = calculatedHours;

                const shift = await db.shift.findFirst({ where: { isDefault: true } });
                if (shift && calculatedHours > shift.overtimeThreshold) {
                  attendanceData.overtimeHours = Math.round((calculatedHours - shift.overtimeThreshold) * 100) / 100;
                } else {
                  attendanceData.overtimeHours = null;
                }
              }

              await db.attendance.upsert({
                where: { userId_date: { userId: uid, date: bmaDateStr } },
                update: attendanceData,
                create: {
                  userId: uid,
                  date: bmaDateStr,
                  ...attendanceData,
                },
              });

              // Create log entries
              if (bmaClockIn) {
                await db.attendanceLog.create({
                  data: {
                    userId: uid,
                    punchType: 'CLOCK_IN',
                    punchTime: new Date(`${bmaDateStr}T${bmaClockIn.length === 5 ? bmaClockIn + ':00' : bmaClockIn}`),
                    method: 'MANUAL',
                    editedBy: user.userId,
                  },
                });
              }
              if (bmaClockOut) {
                await db.attendanceLog.create({
                  data: {
                    userId: uid,
                    punchType: 'CLOCK_OUT',
                    punchTime: new Date(`${bmaDateStr}T${bmaClockOut.length === 5 ? bmaClockOut + ':00' : bmaClockOut}`),
                    method: 'MANUAL',
                    editedBy: user.userId,
                  },
                });
              }

              successCount++;
            } catch (err) {
              failCount++;
              errors.push(`Failed for user ${uid}`);
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `Bulk manual attendance: ${successCount}/${bmaUserIds.length} successful`,
            data: { successCount, failCount, total: bmaUserIds.length, errors },
          });
        }

        default:
          return NextResponse.json(
            { status: 'error', message: `Unknown action: ${action}` },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Attendance Admin POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to process admin action' },
        { status: 500 }
      );
    }
  });
}

// PATCH /api/attendance-admin — Edit attendance record (admin override)
export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { attendanceId, firstIn, lastOut, status, note } = body;

      if (!attendanceId) {
        return NextResponse.json(
          { status: 'error', message: 'Attendance ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.attendance.findUnique({
        where: { id: attendanceId },
      });

      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Attendance record not found' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {
        isEdited: true,
        editedBy: user.userId,
        editedAt: new Date(),
      };

      if (firstIn !== undefined) updateData.firstIn = firstIn;
      if (lastOut !== undefined) updateData.lastOut = lastOut;
      if (status !== undefined) updateData.status = status.toUpperCase();
      if (note !== undefined) updateData.note = note;

      if (firstIn && lastOut) {
        const [inH, inM] = firstIn.split(':').map(Number);
        const [outH, outM] = lastOut.split(':').map(Number);
        const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        const calculatedHours = Math.round((totalMinutes / 60) * 100) / 100;
        updateData.totalHours = calculatedHours;

        const shift = await db.shift.findFirst({ where: { isDefault: true } });
        if (shift && calculatedHours > shift.overtimeThreshold) {
          updateData.overtimeHours = Math.round((calculatedHours - shift.overtimeThreshold) * 100) / 100;
        } else {
          updateData.overtimeHours = null;
        }
      }

      const updated = await db.attendance.update({
        where: { id: attendanceId },
        data: updateData,
        include: {
          user: { select: { id: true, name: true } },
          editor: { select: { name: true } },
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Attendance record updated by admin',
        data: updated,
      });
    } catch (error) {
      console.error('Attendance Admin PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update attendance' },
        { status: 500 }
      );
    }
  });
}
