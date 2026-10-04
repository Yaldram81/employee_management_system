import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// POST /api/leave-admin — Admin-specific leave data and actions
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { action } = body;

      switch (action) {
        case 'dashboard': {
          // Get comprehensive admin leave dashboard data
          const today = new Date().toISOString().split('T')[0];

          // All active users
          const activeUsers = await db.user.findMany({
            where: { isActive: true },
            include: { department: { select: { name: true } } },
          });

          // All leaves (approved + pending) that overlap with today or future
          const currentLeaves = await db.leave.findMany({
            where: {
              status: { in: ['APPROVED', 'PENDING'] },
              startDate: { lte: today },
              endDate: { gte: today },
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
              manager: { select: { name: true } },
            },
          });

          // Pending escalations (pending > 48 hours)
          const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
          const allPending = await db.leave.findMany({
            where: { status: 'PENDING' },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          });

          const escalated = allPending.filter(l => new Date(l.createdAt) < twoDaysAgo);
          const recentPending = allPending.filter(l => new Date(l.createdAt) >= twoDaysAgo);

          // Financial liability: all unused encashable leaves
          const policies = await db.leavePolicy.findMany({ where: { isActive: true, isEncashable: true } });
          const encashableTypes = policies.map(p => p.type);

          const allBalances = await db.leaveBalance.findMany({
            where: { leaveType: { in: encashableTypes } },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
          });

          const currentYear = new Date().getFullYear();
          const dailyRate = () => (25000 / 260); // Default daily rate based on avg salary, 260 working days
          let totalLiability = 0;
          const liabilityByUser: Array<{
            userId: string; userName: string; department: string;
            leaveType: string; unused: number; value: number;
          }> = [];

          for (const bal of allBalances) {
            if (bal.year !== currentYear) continue;
            const unused = bal.total - bal.used;
            if (unused > 0) {
              const rate = dailyRate();
              const value = Math.round(unused * rate * 100) / 100;
              totalLiability += value;
              liabilityByUser.push({
                userId: bal.userId,
                userName: bal.user?.name || 'Unknown',
                department: bal.user?.department?.name || 'N/A',
                leaveType: bal.leaveType,
                unused,
                value,
              });
            }
          }

          // Upcoming overlaps: same department, overlapping dates in next 14 days
          const fourteenDaysLater = new Date();
          fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
          const fourteenDaysLaterStr = fourteenDaysLater.toISOString().split('T')[0];

          const upcomingLeaves = await db.leave.findMany({
            where: {
              status: { in: ['APPROVED', 'PENDING'] },
              startDate: { lte: fourteenDaysLaterStr },
              endDate: { gte: today },
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
            },
          });

          // Group by department to find overlaps
          const deptOverlaps: Array<{ department: string; count: number; employees: string[] }> = [];
          const deptMap = new Map<string, Set<string>>();
          for (const leave of upcomingLeaves) {
            const dept = leave.user?.department?.name || 'Unknown';
            if (!deptMap.has(dept)) deptMap.set(dept, new Set());
            deptMap.get(dept)!.add(leave.user?.name || 'Unknown');
          }
          for (const [dept, names] of deptMap) {
            if (names.size >= 2) {
              deptOverlaps.push({ department: dept, count: names.size, employees: Array.from(names) });
            }
          }

          // Timeline data: all leaves in 30-day window
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 7);
          const thirtyDaysLater = new Date();
          thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 23);

          const timelineLeaves = await db.leave.findMany({
            where: {
              status: { in: ['APPROVED', 'PENDING'] },
              startDate: { lte: thirtyDaysLater.toISOString().split('T')[0] },
              endDate: { gte: thirtyDaysAgo.toISOString().split('T')[0] },
            },
            include: {
              user: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
              manager: { select: { name: true } },
            },
            orderBy: { startDate: 'asc' },
          });

          // Get all leave policies
          const allPolicies = await db.leavePolicy.findMany({ where: { isActive: true } });

          // Get all company holidays
          const allHolidays = await db.companyHoliday.findMany({ orderBy: { date: 'asc' } });

          // Get all leave balances for the wallet drawer
          const allLeaveBalances = await db.leaveBalance.findMany({
            where: { year: currentYear },
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
            },
          });

          // Check lockdown status from system settings
          const lockdownSetting = await db.systemSetting.findUnique({ where: { key: 'leaveLockdown' } });
          const isLockdown = lockdownSetting ? JSON.parse(lockdownSetting.value) : false;

          // All historical leaves for audit trail
          const allLeaves = await db.leave.findMany({
            include: {
              user: { select: { id: true, name: true, department: { select: { name: true } } } },
              manager: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          return NextResponse.json({
            status: 'success',
            message: 'Admin leave dashboard data fetched',
            data: {
              metrics: {
                totalWorkforce: activeUsers.length,
                onLeaveToday: currentLeaves.filter(l => l.status === 'APPROVED').length,
                pendingEscalations: escalated.length,
                totalPending: allPending.length,
                financialLiability: Math.round(totalLiability * 100) / 100,
                deptOverlaps,
                isLockdown,
              },
              escalated,
              recentPending,
              timelineLeaves: timelineLeaves.map(l => ({
                id: l.id,
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                department: l.user?.department?.name || 'N/A',
                departmentId: l.user?.department?.id || null,
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
                reason: l.reason,
                status: l.status,
                managerName: l.manager?.name || null,
                createdAt: l.createdAt,
                reviewedAt: l.reviewedAt,
                attachmentUrl: l.attachmentUrl,
              })),
              policies: allPolicies,
              holidays: allHolidays,
              liabilityByUser,
              allLeaveBalances: allLeaveBalances.map(b => ({
                id: b.id,
                userId: b.userId,
                userName: b.user?.name || 'Unknown',
                department: b.user?.department?.name || 'N/A',
                leaveType: b.leaveType,
                total: b.total,
                used: b.used,
                carriedForward: b.carriedForward,
                year: b.year,
              })),
              allLeaves: allLeaves.map(l => ({
                id: l.id,
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                department: l.user?.department?.name || 'N/A',
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
                reason: l.reason,
                status: l.status,
                managerName: l.manager?.name || null,
                createdAt: l.createdAt,
                reviewedAt: l.reviewedAt,
                attachmentUrl: l.attachmentUrl,
              })),
              currentLeaves: currentLeaves.map(l => ({
                userId: l.userId,
                userName: l.user?.name || 'Unknown',
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
              })),
            },
          });
        }

        case 'toggle-lockdown': {
          const current = await db.systemSetting.findUnique({ where: { key: 'leaveLockdown' } });
          const isCurrentlyLocked = current ? JSON.parse(current.value) : false;
          const newValue = !isCurrentlyLocked;

          await db.systemSetting.upsert({
            where: { key: 'leaveLockdown' },
            update: { value: JSON.stringify(newValue) },
            create: { key: 'leaveLockdown', value: JSON.stringify(newValue) },
          });

          return NextResponse.json({
            status: 'success',
            message: newValue ? 'Leave applications locked' : 'Leave applications unlocked',
            data: { isLockdown: newValue },
          });
        }

        case 'override-balance': {
          const { userId, leaveType, delta, reason: overrideReason } = body;
          if (!userId || !leaveType || delta === undefined) {
            return NextResponse.json({ status: 'error', message: 'userId, leaveType, and delta are required' }, { status: 400 });
          }

          const currentYear = new Date().getFullYear();
          const existing = await db.leaveBalance.findUnique({
            where: { userId_leaveType_year: { userId, leaveType, year: currentYear } },
          });

          if (!existing) {
            // Create new balance
            await db.leaveBalance.create({
              data: { userId, leaveType, total: Math.max(0, delta), used: 0, year: currentYear },
            });
          } else {
            await db.leaveBalance.update({
              where: { id: existing.id },
              data: { total: Math.max(0, existing.total + delta) },
            });
          }

          return NextResponse.json({
            status: 'success',
            message: `Balance ${delta > 0 ? 'credited' : 'debited'} by ${Math.abs(delta)} days`,
          });
        }

        case 'year-end-rollover': {
          // Run year-end rollover for all users
          const currentYear2 = new Date().getFullYear();
          const nextYear = currentYear2 + 1;
          const allPolicies2 = await db.leavePolicy.findMany({ where: { carriesForward: true, isActive: true } });
          const allUsers2 = await db.user.findMany({ where: { isActive: true } });

          let rolloverCount = 0;
          for (const policy of allPolicies2) {
            for (const u of allUsers2) {
              const currentBal = await db.leaveBalance.findUnique({
                where: { userId_leaveType_year: { userId: u.id, leaveType: policy.type, year: currentYear2 } },
              });

              if (!currentBal) continue;
              const unused = currentBal.total - currentBal.used;
              const carry = Math.min(unused, policy.maxCarryForward);

              if (carry > 0) {
                // Create or update next year's balance
                const existing2 = await db.leaveBalance.findUnique({
                  where: { userId_leaveType_year: { userId: u.id, leaveType: policy.type, year: nextYear } },
                });

                if (existing2) {
                  await db.leaveBalance.update({
                    where: { id: existing2.id },
                    data: { carriedForward: carry, total: policy.annualQuota + carry },
                  });
                } else {
                  await db.leaveBalance.create({
                    data: { userId: u.id, leaveType: policy.type, total: policy.annualQuota + carry, used: 0, carriedForward: carry, year: nextYear },
                  });
                }
                rolloverCount++;
              }
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `Year-end rollover complete. ${rolloverCount} balances updated.`,
            data: { rolloverCount },
          });
        }

        default:
          return NextResponse.json({ status: 'error', message: `Unknown action: ${action}` }, { status: 400 });
      }
    } catch (error) {
      console.error('Leave Admin POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to process admin leave action' }, { status: 500 });
    }
  });
}
