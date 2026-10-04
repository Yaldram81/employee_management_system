import { db } from '@/lib/db';
import { optionalAuth } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────
// Helper: Date utilities
// ─────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr: string, holidaySet: Set<string>): boolean {
  return holidaySet.has(dateStr);
}

function workingDaysBetween(startStr: string, endStr: string, holidaySet: Set<string> = new Set()): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const ds = formatDateStr(current);
    if (!isWeekend(current) && !isHoliday(ds, holidaySet)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(count, 1);
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

// ─────────────────────────────────────────────────────────────
// Helper: Risk calculation
// ─────────────────────────────────────────────────────────────

type CoverageRisk = 'low' | 'medium' | 'high' | 'critical';

function getCoverageRisk(ratio: number): CoverageRisk {
  if (ratio >= 0.7) return 'critical';
  if (ratio >= 0.5) return 'high';
  if (ratio >= 0.3) return 'medium';
  return 'low';
}

function getRiskScore(ratio: number): number {
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────
// Helper: Get user's department team info
// ─────────────────────────────────────────────────────────────

interface TeamInfo {
  user: { id: string; name: string; departmentId: string | null };
  teamMembers: Array<{ id: string; name: string }>;
  teamSize: number;
}

async function getTeamInfo(userId: string): Promise<TeamInfo | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, departmentId: true },
  });

  if (!user) return null;
  if (!user.departmentId) {
    return { user, teamMembers: [], teamSize: 0 };
  }

  const teamMembers = await db.user.findMany({
    where: {
      departmentId: user.departmentId,
      isActive: true,
    },
    select: { id: true, name: true },
  });

  return { user, teamMembers, teamSize: teamMembers.length };
}

// ─────────────────────────────────────────────────────────────
// Helper: In-memory overlap calculation from pre-fetched leaves
// ─────────────────────────────────────────────────────────────

interface LeaveRecord {
  userId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
}

function calculateOverlapFromMemory(
  leaves: LeaveRecord[],
  teamSize: number,
  startDate: string,
  endDate: string
): {
  overlapCount: number;
  teamSize: number;
  availableCount: number;
  coverageRisk: CoverageRisk;
  riskScore: number;
  overlappingMembers: Array<{ userId: string; name: string; leaveType: string; startDate: string; endDate: string }>;
} {
  const overlapping = leaves.filter(l => l.startDate <= endDate && l.endDate >= startDate);

  // Deduplicate by userId (a user could have multiple overlapping leaves)
  const seenUsers = new Map<string, { name: string; leaveType: string; startDate: string; endDate: string }>();
  for (const l of overlapping) {
    if (!seenUsers.has(l.userId)) {
      seenUsers.set(l.userId, { name: l.name, leaveType: l.type.toLowerCase(), startDate: l.startDate, endDate: l.endDate });
    }
  }

  const overlapCount = seenUsers.size;
  const availableCount = teamSize - overlapCount;
  const ratio = teamSize > 0 ? overlapCount / teamSize : 0;

  return {
    overlapCount,
    teamSize,
    availableCount,
    coverageRisk: getCoverageRisk(ratio),
    riskScore: getRiskScore(ratio),
    overlappingMembers: Array.from(seenUsers.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// Helper: Get company holidays as a Set of date strings
// ─────────────────────────────────────────────────────────────

async function getCompanyHolidaySet(): Promise<Set<string>> {
  const holidays = await db.companyHoliday.findMany({
    select: { date: true },
  });
  return new Set(holidays.map(h => h.date));
}

// ─────────────────────────────────────────────────────────────
// Helper: Generate warning message
// ─────────────────────────────────────────────────────────────

function getWarningMessage(overlapCount: number, teamSize: number, risk: CoverageRisk, startDate: string, endDate: string): string {
  if (risk === 'low') {
    return overlapCount === 0
      ? 'No team members on leave during this period'
      : `Only ${overlapCount} of ${teamSize} team member${overlapCount > 1 ? 's' : ''} on leave — low coverage risk`;
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const periodLabel = diffDays <= 1 ? 'that day' : diffDays <= 7 ? 'that week' : 'that period';

  const emoji = risk === 'critical' ? '🔴' : risk === 'high' ? '⚠️' : '⚡';
  return `${emoji} ${overlapCount} of ${teamSize} team members are on leave ${periodLabel} — ${risk} coverage risk`;
}

// ─────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Resolve userId — prefer authenticated user, fall back to body for demo mode
    const authUser: AuthUser | null = optionalAuth(request as never);
    const userId = authUser?.userId || body.userId;

    if (!userId) {
      return Response.json(
        { error: 'userId is required (provide Authorization header or userId in body)' },
        { status: 400 }
      );
    }

    switch (action) {
      // ─────────────────────────────────────────────────────────────
      // CHECK-CONFLICT — Check team coverage risk for a date range
      // ─────────────────────────────────────────────────────────────
      case 'check-conflict': {
        const { startDate, endDate } = body;
        if (!startDate || !endDate) {
          return Response.json(
            { error: 'startDate and endDate are required (YYYY-MM-DD)' },
            { status: 400 }
          );
        }

        const teamInfo = await getTeamInfo(userId);
        if (!teamInfo) {
          return Response.json({ error: 'User not found' }, { status: 404 });
        }
        if (teamInfo.teamSize === 0) {
          return Response.json(
            { error: 'User has no department or team' },
            { status: 400 }
          );
        }

        // Get all department members' leaves that could overlap (excluding the requesting user)
        const memberIds = teamInfo.teamMembers.map(m => m.id);
        const otherMemberIds = memberIds.filter(id => id !== userId);

        const allRangeLeaves = otherMemberIds.length > 0
          ? await db.leave.findMany({
              where: {
                userId: { in: otherMemberIds },
                status: { in: ['APPROVED', 'PENDING'] },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
              include: {
                user: { select: { id: true, name: true } },
              },
            })
          : [];

        const leaveRecords: LeaveRecord[] = allRangeLeaves.map(l => ({
          userId: l.userId,
          name: l.user?.name || 'Unknown',
          type: l.type,
          startDate: l.startDate,
          endDate: l.endDate,
        }));

        const analysis = calculateOverlapFromMemory(leaveRecords, teamInfo.teamSize, startDate, endDate);

        // Build daily breakdown
        const dailyBreakdown: Array<{
          date: string;
          available: number;
          total: number;
          awayMembers: Array<{ name: string; type: string }>;
        }> = [];

        const start = parseDate(startDate);
        const end = parseDate(endDate);
        const current = new Date(start);

        while (current <= end) {
          const dateStr = formatDateStr(current);
          const awayMembers: Array<{ name: string; type: string }> = [];

          for (const leave of allRangeLeaves) {
            if (leave.startDate <= dateStr && leave.endDate >= dateStr) {
              awayMembers.push({
                name: leave.user?.name || 'Unknown',
                type: leave.type.toLowerCase(),
              });
            }
          }

          const uniqueAway = new Set(awayMembers.map(m => m.name));
          dailyBreakdown.push({
            date: dateStr,
            available: teamInfo.teamSize - uniqueAway.size,
            total: teamInfo.teamSize,
            awayMembers,
          });

          current.setDate(current.getDate() + 1);
        }

        const warningMessage = getWarningMessage(
          analysis.overlapCount,
          analysis.teamSize,
          analysis.coverageRisk,
          startDate,
          endDate
        );

        return Response.json({
          data: {
            overlapCount: analysis.overlapCount,
            teamSize: analysis.teamSize,
            availableCount: analysis.availableCount,
            coverageRisk: analysis.coverageRisk,
            riskScore: analysis.riskScore,
            overlappingMembers: analysis.overlappingMembers,
            dailyBreakdown,
            warningMessage,
          },
        });
      }

      // ─────────────────────────────────────────────────────────────
      // SUGGEST-ALTERNATIVES — Find best alternative date ranges
      // ─────────────────────────────────────────────────────────────
      case 'suggest-alternatives': {
        const { startDate, endDate, duration } = body;
        if (!startDate || !endDate) {
          return Response.json(
            { error: 'startDate and endDate are required (YYYY-MM-DD)' },
            { status: 400 }
          );
        }

        const teamInfo = await getTeamInfo(userId);
        if (!teamInfo) {
          return Response.json({ error: 'User not found' }, { status: 404 });
        }
        if (teamInfo.teamSize === 0) {
          return Response.json(
            { error: 'User has no department or team' },
            { status: 400 }
          );
        }

        const holidaySet = await getCompanyHolidaySet();

        // Calculate duration in working days
        const requestedDuration = duration || workingDaysBetween(startDate, endDate, holidaySet);

        // Get the user's own approved/pending leaves to exclude them from conflict counting
        const userOwnLeaves = await db.leave.findMany({
          where: {
            userId,
            status: { in: ['APPROVED', 'PENDING'] },
          },
          select: { startDate: true, endDate: true },
        });

        // Pre-fetch ALL department leaves for the entire search window (±30 days + duration)
        // This avoids N+1 DB queries in the loop
        const memberIds = teamInfo.teamMembers.map(m => m.id);
        const otherMemberIds = memberIds.filter(id => id !== userId);

        const searchStart = addDays(startDate, -30);
        const searchEnd = addDays(addDays(startDate, 30), requestedDuration);

        const allDepartmentLeaves = otherMemberIds.length > 0
          ? await db.leave.findMany({
              where: {
                userId: { in: otherMemberIds },
                status: { in: ['APPROVED', 'PENDING'] },
                startDate: { lte: searchEnd },
                endDate: { gte: searchStart },
              },
              include: {
                user: { select: { id: true, name: true } },
              },
            })
          : [];

        const leaveRecords: LeaveRecord[] = allDepartmentLeaves.map(l => ({
          userId: l.userId,
          name: l.user?.name || 'Unknown',
          type: l.type,
          startDate: l.startDate,
          endDate: l.endDate,
        }));

        // Calculate original risk using the same in-memory method
        const originalAnalysis = calculateOverlapFromMemory(leaveRecords, teamInfo.teamSize, startDate, endDate);

        // Search for alternatives within ±30 days
        const alternatives: Array<{
          startDate: string;
          endDate: string;
          overlapCount: number;
          coverageRisk: CoverageRisk;
          riskScore: number;
          label: string;
          reason: string;
        }> = [];

        const candidateStart = parseDate(searchStart);
        const searchEndDate = parseDate(addDays(startDate, 30));

        while (candidateStart <= searchEndDate) {
          const candidateStartStr = formatDateStr(candidateStart);

          // Skip if same as original start date
          if (candidateStartStr === startDate) {
            candidateStart.setDate(candidateStart.getDate() + 1);
            continue;
          }

          // Skip weekends for start date
          if (isWeekend(candidateStart)) {
            candidateStart.setDate(candidateStart.getDate() + 1);
            continue;
          }

          // Skip holidays for start date
          if (isHoliday(candidateStartStr, holidaySet)) {
            candidateStart.setDate(candidateStart.getDate() + 1);
            continue;
          }

          // Calculate end date based on working day duration
          let workingDaysRemaining = requestedDuration;
          const candidateEnd = new Date(candidateStart);
          let candidateEndStr = formatDateStr(candidateEnd);

          while (workingDaysRemaining > 0) {
            const ds = formatDateStr(candidateEnd);
            if (!isWeekend(candidateEnd) && !isHoliday(ds, holidaySet)) {
              workingDaysRemaining--;
              if (workingDaysRemaining === 0) {
                candidateEndStr = ds;
              }
            }
            if (workingDaysRemaining > 0) {
              candidateEnd.setDate(candidateEnd.getDate() + 1);
            }
          }

          // Check if this alternative overlaps with user's own existing leaves
          const overlapsOwnLeave = userOwnLeaves.some(
            l => l.startDate <= candidateEndStr && l.endDate >= candidateStartStr
          );
          if (overlapsOwnLeave) {
            candidateStart.setDate(candidateStart.getDate() + 1);
            continue;
          }

          // Calculate overlap for this candidate range (in-memory, no DB call)
          const candidateAnalysis = calculateOverlapFromMemory(leaveRecords, teamInfo.teamSize, candidateStartStr, candidateEndStr);

          // Generate reason
          let reason: string;
          if (candidateAnalysis.overlapCount === 0) {
            reason = 'No team members on leave';
          } else if (candidateAnalysis.overlapCount === 1) {
            reason = 'Only 1 team member on leave';
          } else {
            reason = `${candidateAnalysis.overlapCount} team members on leave — ${candidateAnalysis.coverageRisk} risk`;
          }

          // Generate label (e.g. "Mar 20-22")
          const startParsed = parseDate(candidateStartStr);
          const endParsed = parseDate(candidateEndStr);
          const startMonth = startParsed.toLocaleString('en', { month: 'short' });
          const endMonth = endParsed.toLocaleString('en', { month: 'short' });

          const label = startMonth === endMonth
            ? `${startMonth} ${startParsed.getDate()}-${endParsed.getDate()}`
            : `${startMonth} ${startParsed.getDate()} - ${endMonth} ${endParsed.getDate()}`;

          alternatives.push({
            startDate: candidateStartStr,
            endDate: candidateEndStr,
            overlapCount: candidateAnalysis.overlapCount,
            coverageRisk: candidateAnalysis.coverageRisk,
            riskScore: candidateAnalysis.riskScore,
            label,
            reason,
          });

          candidateStart.setDate(candidateStart.getDate() + 1);
        }

        // Sort by risk score (ascending), then by start date
        alternatives.sort((a, b) => {
          if (a.riskScore !== b.riskScore) return a.riskScore - b.riskScore;
          return a.startDate.localeCompare(b.startDate);
        });

        // Return top 3 alternatives
        const topAlternatives = alternatives.slice(0, 3);

        return Response.json({
          data: {
            originalRisk: originalAnalysis.coverageRisk,
            alternatives: topAlternatives,
          },
        });
      }

      // ─────────────────────────────────────────────────────────────
      // TEAM-HEATMAP — Daily team availability for a month
      // ─────────────────────────────────────────────────────────────
      case 'team-heatmap': {
        const { year, month } = body;
        if (!year || !month) {
          return Response.json(
            { error: 'year and month are required (month: 1-12)' },
            { status: 400 }
          );
        }

        const yearNum = Number(year);
        const monthNum = Number(month);

        if (monthNum < 1 || monthNum > 12) {
          return Response.json(
            { error: 'month must be between 1 and 12' },
            { status: 400 }
          );
        }

        const teamInfo = await getTeamInfo(userId);
        if (!teamInfo) {
          return Response.json({ error: 'User not found' }, { status: 404 });
        }
        if (teamInfo.teamSize === 0) {
          return Response.json(
            { error: 'User has no department or team' },
            { status: 400 }
          );
        }

        const memberIds = teamInfo.teamMembers.map(m => m.id);
        const teamSize = teamInfo.teamSize;

        // Calculate month boundaries
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0);
        const monthStartStr = formatDateStr(monthStart);
        const monthEndStr = formatDateStr(monthEnd);

        // Get all approved/pending leaves that overlap with this month (single query)
        const monthLeaves = memberIds.length > 0
          ? await db.leave.findMany({
              where: {
                userId: { in: memberIds },
                status: { in: ['APPROVED', 'PENDING'] },
                startDate: { lte: monthEndStr },
                endDate: { gte: monthStartStr },
              },
              include: {
                user: { select: { id: true, name: true } },
              },
            })
          : [];

        // Build daily data
        const days: Array<{
          date: string;
          available: number;
          away: number;
          riskLevel: CoverageRisk;
          members: Array<{ userId: string; name: string; status: string; leaveType?: string }>;
        }> = [];

        const current = new Date(monthStart);
        while (current <= monthEnd) {
          const dateStr = formatDateStr(current);

          const memberStatuses: Array<{ userId: string; name: string; status: string; leaveType?: string }> = [];

          for (const member of teamInfo.teamMembers) {
            const memberLeaves = monthLeaves.filter(
              l => l.userId === member.id && l.startDate <= dateStr && l.endDate >= dateStr
            );

            if (memberLeaves.length > 0) {
              const primaryLeave = memberLeaves[0];
              memberStatuses.push({
                userId: member.id,
                name: member.name,
                status: 'away',
                leaveType: primaryLeave.type.toLowerCase(),
              });
            } else {
              memberStatuses.push({
                userId: member.id,
                name: member.name,
                status: 'available',
              });
            }
          }

          const awayCount = memberStatuses.filter(m => m.status === 'away').length;
          const availableCount = teamSize - awayCount;

          // Risk level based on available/teamSize ratio
          let riskLevel: CoverageRisk;
          const availableRatio = teamSize > 0 ? availableCount / teamSize : 1;
          if (availableRatio >= 0.7) riskLevel = 'low';
          else if (availableRatio >= 0.5) riskLevel = 'medium';
          else if (availableRatio >= 0.3) riskLevel = 'high';
          else riskLevel = 'critical';

          days.push({
            date: dateStr,
            available: availableCount,
            away: awayCount,
            riskLevel,
            members: memberStatuses,
          });

          current.setDate(current.getDate() + 1);
        }

        return Response.json({
          data: {
            teamSize,
            days,
          },
        });
      }

      default:
        return Response.json(
          { error: `Unknown action: ${action}. Supported: check-conflict, suggest-alternatives, team-heatmap` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Leave conflict API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
