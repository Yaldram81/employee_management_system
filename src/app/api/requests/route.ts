import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { emitRealtimeEvent, RealtimeEvents } from '@/lib/realtime';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Get the department ID that a manager manages (via Department.managerId) */
async function getManagerDepartmentId(managerId: string): Promise<string | null> {
  const dept = await db.department.findFirst({
    where: { managerId },
    select: { id: true },
  });
  return dept?.id ?? null;
}

/** Get all user IDs that belong to a manager's department */
async function getManagerTeamUserIds(managerId: string): Promise<{ deptId: string | null; userIds: string[] }> {
  const deptId = await getManagerDepartmentId(managerId);
  if (!deptId) return { deptId: null, userIds: [] };
  const members = await db.user.findMany({
    where: { departmentId: deptId, isActive: true },
    select: { id: true },
  });
  return { deptId, userIds: members.map(m => m.id) };
}

/** Verify a request belongs to the manager's department scope */
async function verifyRequestInDepartment(
  requestId: string,
  deptId: string
): Promise<{ error: NextResponse | null; req: Awaited<ReturnType<typeof db.request.findUnique>> | null }> {
  const req = await db.request.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
      reviewer: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
    },
  });
  if (!req) return { error: NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 }), req: null };
  if (req.departmentId !== deptId) {
    return { error: NextResponse.json({ status: 'error', message: 'Request does not belong to your department' }, { status: 403 }), req: null };
  }
  return { error: null, req };
}

/** Append a timestamped line to reviewComment */
function appendToReviewComment(existing: string | null, prefix: string, content: string): string {
  const ts = new Date().toISOString();
  const line = `[${prefix} @ ${ts}]: ${content}`;
  return existing ? `${existing}\n${line}` : line;
}

// ─────────────────────────────────────────────────────────────
// GET — List / Dashboard / Report / Team Summary
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');
      let userId = searchParams.get('userId');
      const type = searchParams.get('type');
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const departmentId = searchParams.get('departmentId');
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '0', 10);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      const userRole = user.role.toLowerCase();

      // ─── action=request-report (manager/admin only) ────────────
      if (action === 'request-report') {
        if (!['admin', 'manager'].includes(userRole)) {
          return NextResponse.json({ status: 'error', message: 'Insufficient permissions' }, { status: 403 });
        }

        const deptId = userRole === 'manager' ? await getManagerDepartmentId(user.userId) : null;
        const where: Record<string, unknown> = {};
        if (deptId) where.departmentId = deptId;
        if (startDate || endDate) {
          const createdAt: Record<string, Date> = {};
          if (startDate) createdAt.gte = new Date(startDate);
          if (endDate) createdAt.lte = new Date(endDate);
          where.createdAt = createdAt;
        }

        const allRequests = await db.request.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
            reviewer: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Type distribution
        const typeDistribution: Record<string, number> = {};
        allRequests.forEach(r => {
          const t = r.type.toLowerCase();
          typeDistribution[t] = (typeDistribution[t] || 0) + 1;
        });

        // Approval rates
        const total = allRequests.length;
        const approved = allRequests.filter(r => r.status === 'APPROVED').length;
        const rejected = allRequests.filter(r => r.status === 'REJECTED').length;
        const pending = allRequests.filter(r => r.status === 'PENDING').length;
        const underReview = allRequests.filter(r => r.status === 'UNDER_REVIEW').length;
        const cancelled = allRequests.filter(r => r.status === 'CANCELLED').length;
        const escalated = allRequests.filter(r => r.status === 'ESCALATED').length;
        const resolved = approved + rejected;
        const approvalRate = resolved > 0 ? Math.round((approved / resolved) * 100) : 0;
        const rejectionRate = resolved > 0 ? Math.round((rejected / resolved) * 100) : 0;

        // Average response time
        const resolvedRequests = allRequests.filter(r => r.reviewedAt && r.createdAt);
        const avgResponseMs = resolvedRequests.length > 0
          ? resolvedRequests.reduce((sum, r) => {
              return sum + (new Date(r.reviewedAt!).getTime() - new Date(r.createdAt).getTime());
            }, 0) / resolvedRequests.length
          : 0;
        const avgResponseHours = Math.round(avgResponseMs / (1000 * 60 * 60) * 10) / 10;

        // Expense analysis
        const expenseRequests = allRequests.filter(r => r.type === 'EXPENSE');
        const totalExpenseAmount = expenseRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
        const approvedExpenses = expenseRequests.filter(r => r.status === 'APPROVED');
        const approvedExpenseTotal = approvedExpenses.reduce((sum, r) => sum + (r.amount || 0), 0);
        const pendingExpenses = expenseRequests.filter(r => r.status === 'PENDING');
        const pendingExpenseTotal = pendingExpenses.reduce((sum, r) => sum + (r.amount || 0), 0);

        // Priority distribution
        const priorityDistribution: Record<string, number> = {};
        allRequests.forEach(r => {
          const p = (r.priority || 'MEDIUM').toLowerCase();
          priorityDistribution[p] = (priorityDistribution[p] || 0) + 1;
        });

        // SLA compliance (resolved within 48 hours)
        const slaCompliant = resolvedRequests.filter(r => {
          return (new Date(r.reviewedAt!).getTime() - new Date(r.createdAt).getTime()) <= 48 * 60 * 60 * 1000;
        }).length;
        const slaRate = resolvedRequests.length > 0 ? Math.round((slaCompliant / resolvedRequests.length) * 100) : 100;

        // Monthly trend (last 6 months)
        const monthlyTrend: Array<{ month: string; year: number; total: number; approved: number; rejected: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
          const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
          const monthReqs = allRequests.filter(r => {
            const created = new Date(r.createdAt);
            return created >= mStart && created <= mEnd;
          });
          monthlyTrend.push({
            month: d.toLocaleString('default', { month: 'short' }),
            year: d.getFullYear(),
            total: monthReqs.length,
            approved: monthReqs.filter(r => r.status === 'APPROVED').length,
            rejected: monthReqs.filter(r => r.status === 'REJECTED').length,
          });
        }

        return NextResponse.json({
          status: 'success',
          data: {
            overview: {
              total,
              approved,
              rejected,
              pending,
              underReview,
              cancelled,
              escalated,
              approvalRate,
              rejectionRate,
              avgResponseHours,
              slaRate,
            },
            typeDistribution,
            priorityDistribution,
            expenseAnalysis: {
              totalExpenseAmount,
              approvedExpenseTotal,
              pendingExpenseTotal,
              expenseCount: expenseRequests.length,
              approvedExpenseCount: approvedExpenses.length,
              pendingExpenseCount: pendingExpenses.length,
            },
            monthlyTrend,
          },
        });
      }

      // ─── action=team-summary (manager/admin only) ─────────────
      if (action === 'team-summary') {
        if (!['admin', 'manager'].includes(userRole)) {
          return NextResponse.json({ status: 'error', message: 'Insufficient permissions' }, { status: 403 });
        }

        const deptId = userRole === 'manager' ? await getManagerDepartmentId(user.userId) : null;
        if (!deptId && userRole === 'manager') {
          return NextResponse.json({ status: 'error', message: 'No department found for manager' }, { status: 404 });
        }

        const deptFilter = deptId || departmentId;
        const teamMembers = await db.user.findMany({
          where: { departmentId: deptFilter, isActive: true },
          select: { id: true, name: true, email: true },
        });

        const teamUserIds = teamMembers.map(m => m.id);
        const teamRequests = await db.request.findMany({
          where: { userId: { in: teamUserIds } },
          select: { id: true, userId: true, status: true, type: true, createdAt: true, reviewedAt: true },
        });

        const memberStats = teamMembers.map(member => {
          const memberReqs = teamRequests.filter(r => r.userId === member.id);
          return {
            userId: member.id,
            userName: member.name,
            userEmail: member.email,
            total: memberReqs.length,
            approved: memberReqs.filter(r => r.status === 'APPROVED').length,
            rejected: memberReqs.filter(r => r.status === 'REJECTED').length,
            pending: memberReqs.filter(r => r.status === 'PENDING').length,
            underReview: memberReqs.filter(r => r.status === 'UNDER_REVIEW').length,
            cancelled: memberReqs.filter(r => r.status === 'CANCELLED').length,
            escalated: memberReqs.filter(r => r.status === 'ESCALATED').length,
          };
        });

        return NextResponse.json({
          status: 'success',
          data: {
            departmentId: deptFilter,
            teamSize: teamMembers.length,
            totalRequests: teamRequests.length,
            memberStats,
          },
        });
      }

      // ─── action=dashboard (existing, preserved) ───────────────
      if (action === 'dashboard') {
        const allRequests = await db.request.findMany({
          include: {
            user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
            reviewer: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const total = allRequests.length;
        const pending = allRequests.filter(r => r.status === 'PENDING').length;
        const underReview = allRequests.filter(r => r.status === 'UNDER_REVIEW').length;
        const approved = allRequests.filter(r => r.status === 'APPROVED').length;
        const rejected = allRequests.filter(r => r.status === 'REJECTED').length;
        const escalated = allRequests.filter(r => r.status === 'ESCALATED').length;
        const cancelled = allRequests.filter(r => r.status === 'CANCELLED').length;

        const typeDistribution: Record<string, number> = {};
        allRequests.forEach(r => {
          const t = r.type.toLowerCase();
          typeDistribution[t] = (typeDistribution[t] || 0) + 1;
        });

        const deptDistribution: Record<string, number> = {};
        allRequests.forEach(r => {
          const dept = r.department?.name || r.user?.department?.name || 'Unassigned';
          deptDistribution[dept] = (deptDistribution[dept] || 0) + 1;
        });

        const priorityDistribution: Record<string, number> = {};
        allRequests.forEach(r => {
          const p = (r.priority || 'MEDIUM').toLowerCase();
          priorityDistribution[p] = (priorityDistribution[p] || 0) + 1;
        });

        const resolvedRequests = allRequests.filter(r => r.reviewedAt && r.createdAt);
        const avgResolutionMs = resolvedRequests.length > 0
          ? resolvedRequests.reduce((sum, r) => {
              const created = new Date(r.createdAt).getTime();
              const reviewed = new Date(r.reviewedAt!).getTime();
              return sum + (reviewed - created);
            }, 0) / resolvedRequests.length
          : 0;
        const avgResolutionHours = Math.round(avgResolutionMs / (1000 * 60 * 60) * 10) / 10;

        const slaCompliant = resolvedRequests.filter(r => {
          const created = new Date(r.createdAt).getTime();
          const reviewed = new Date(r.reviewedAt!).getTime();
          return (reviewed - created) <= 48 * 60 * 60 * 1000;
        }).length;
        const slaRate = resolvedRequests.length > 0
          ? Math.round((slaCompliant / resolvedRequests.length) * 100)
          : 100;

        const totalExpenseAmount = allRequests
          .filter(r => r.type === 'EXPENSE' && r.amount)
          .reduce((sum, r) => sum + (r.amount || 0), 0);

        const recentActivity = allRequests.slice(0, 10).map(r => ({
          id: r.id,
          type: r.type,
          title: r.title,
          status: r.status,
          userName: r.user?.name || '',
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt,
        }));

        return NextResponse.json({
          status: 'success',
          data: {
            metrics: {
              total,
              pending,
              underReview,
              approved,
              rejected,
              escalated,
              cancelled,
              avgResolutionHours,
              slaRate,
              totalExpenseAmount,
            },
            typeDistribution,
            deptDistribution,
            priorityDistribution,
            recentActivity,
          },
        });
      }

      // ─── Default list with pagination & date filtering ─────────
      // Employees can only see their own requests
      if (userRole === 'employee') {
        userId = user.userId;
      }

      // Managers see department requests
      let deptFilter: string | null = null;
      if (userRole === 'manager') {
        const managerDept = await db.department.findFirst({
          where: { managerId: user.userId },
        });
        if (managerDept) {
          deptFilter = managerDept.id;
        }
      }

      const where: Record<string, unknown> = {};
      if (userRole === 'employee') {
        where.userId = user.userId;
      } else if (userRole === 'manager') {
        // Managers see their department's requests + their own
        if (deptFilter) {
          if (userId) {
            // If a specific user is requested, filter to that user within the department
            where.AND = [
              { OR: [{ departmentId: deptFilter }, { userId: user.userId }] },
              { userId },
            ];
          } else {
            where.OR = [
              { departmentId: deptFilter },
              { userId: user.userId },
            ];
          }
        } else {
          where.userId = userId || user.userId;
        }
      } else {
        // Admin sees all requests by default
        // Only filter by userId if explicitly provided as a search filter (from the UI, not the store's auto-param)
        // The store always passes userId in the URL, but admins should see everything
      }
      if (type) where.type = type.toUpperCase();
      if (status) where.status = status.toUpperCase();
      if (priority) where.priority = priority.toUpperCase();
      if (departmentId) where.departmentId = departmentId;

      // Date range filtering
      if (startDate || endDate) {
        const createdAt: Record<string, Date> = {};
        if (startDate) createdAt.gte = new Date(startDate);
        if (endDate) createdAt.lte = new Date(endDate);
        where.createdAt = createdAt;
      }

      // Count total for pagination metadata
      const totalCount = await db.request.count({ where });

      const requests = await db.request.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
          reviewer: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...(limit > 0 ? { skip: (page - 1) * limit, take: limit } : {}),
      });

      return NextResponse.json({
        status: 'success',
        message: 'Requests fetched successfully',
        data: requests,
        ...(limit > 0 ? {
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        } : {}),
      });
    } catch (error) {
      console.error('Requests GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch requests' },
        { status: 500 }
      );
    }
  });
}

// ─────────────────────────────────────────────────────────────
// POST — Create Request (preserved as-is)
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      let { userId, type, payload, title, description, amount, priority, departmentId, dueDate } = body;

      // Employees can only submit requests for themselves
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      if (!userId || !type) {
        return NextResponse.json(
          { status: 'error', message: 'User ID and type are required' },
          { status: 400 }
        );
      }

      const userRecord = await db.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });
      if (!userRecord) {
        return NextResponse.json(
          { status: 'error', message: 'User not found' },
          { status: 404 }
        );
      }

      // Build the payload JSON
      const payloadData = typeof payload === 'string' ? JSON.parse(payload) : (payload || {});
      if (title) payloadData.title = title;
      if (description) payloadData.description = description;
      if (amount) payloadData.amount = amount;

      const req = await db.request.create({
        data: {
          userId,
          type: type.toUpperCase(),
          title: title || payloadData.title || type,
          description: description || payloadData.description || '',
          amount: amount ? parseFloat(String(amount)) : (payloadData.amount ? parseFloat(String(payloadData.amount)) : null),
          priority: (priority || 'MEDIUM').toUpperCase(),
          payload: JSON.stringify(payloadData),
          departmentId: departmentId || userRecord.departmentId || null,
          dueDate: dueDate || null,
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
          reviewer: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      });

      // Notify department manager if exists
      if (req.departmentId) {
        const dept = await db.department.findUnique({ where: { id: req.departmentId } });
        if (dept?.managerId) {
          const notification = await db.notification.create({
            data: {
              userId: dept.managerId,
              type: 'APPROVAL_REQUIRED',
              title: 'New Request Submitted',
              message: `${userRecord.name} submitted a ${type.toLowerCase()} request: ${req.title || type}`,
              actionUrl: '/requests',
            },
          });
          // Push real-time notification
          emitRealtimeEvent(dept.managerId, RealtimeEvents.NOTIFICATION_NEW, {
            id: notification.id, userId: dept.managerId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
          }).catch(() => {});
        }
      }

      return NextResponse.json(
        {
          status: 'success',
          message: 'Request submitted successfully',
          data: req,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Requests POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to submit request' },
        { status: 500 }
      );
    }
  });
}

// ─────────────────────────────────────────────────────────────
// PATCH — Update / Enterprise Actions
// ─────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, status, reviewComment, action } = body;
      const reviewerId = user.userId;

      // ═══════════════════════════════════════════════════════════
      // Enterprise actions that don't require a single `id`
      // ═══════════════════════════════════════════════════════════

      // ─── bulk-update ────────────────────────────────────────
      if (action === 'bulk-update') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { ids, status: bulkStatus, priority: bulkPriority, reviewComment: bulkComment } = body;
          if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ status: 'error', message: 'ids array is required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;

          // For managers, verify all requests belong to their department
          if (user.role.toLowerCase() === 'manager') {
            if (!deptId) {
              return NextResponse.json({ status: 'error', message: 'No department found for manager' }, { status: 404 });
            }
            const outsideDept = await db.request.findMany({
              where: { id: { in: ids }, departmentId: { not: deptId } },
              select: { id: true },
            });
            if (outsideDept.length > 0) {
              return NextResponse.json(
                { status: 'error', message: `${outsideDept.length} request(s) do not belong to your department` },
                { status: 403 }
              );
            }
          }

          const updateData: Record<string, unknown> = {};
          if (bulkStatus) {
            const validStatuses = ['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'CANCELLED', 'ESCALATED', 'PENDING'];
            if (!validStatuses.includes(bulkStatus.toUpperCase())) {
              return NextResponse.json(
                { status: 'error', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
              );
            }
            updateData.status = bulkStatus.toUpperCase();
            updateData.reviewerId = reviewerId;
            updateData.reviewedAt = new Date();

            if (bulkStatus.toUpperCase() === 'APPROVED') updateData.resolvedAt = new Date();
            if (bulkStatus.toUpperCase() === 'CANCELLED') updateData.cancelledAt = new Date();
            if (bulkStatus.toUpperCase() === 'ESCALATED') {
              updateData.escalatedAt = new Date();
              updateData.escalatedBy = reviewerId;
            }
          }
          if (bulkPriority) {
            const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
            if (!validPriorities.includes(bulkPriority.toUpperCase())) {
              return NextResponse.json(
                { status: 'error', message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
                { status: 400 }
              );
            }
            updateData.priority = bulkPriority.toUpperCase();
          }
          if (bulkComment) {
            // We'll update reviewComment individually to append
          }

          if (Object.keys(updateData).length === 0 && !bulkComment) {
            return NextResponse.json({ status: 'error', message: 'No updates provided' }, { status: 400 });
          }

          let updatedCount = 0;
          for (const reqId of ids) {
            try {
              const existing = await db.request.findUnique({ where: { id: reqId } });
              if (!existing) continue;

              const finalData: Record<string, unknown> = { ...updateData };
              if (bulkComment) {
                finalData.reviewComment = appendToReviewComment(existing.reviewComment, 'Bulk Update', bulkComment);
              }

              await db.request.update({ where: { id: reqId }, data: finalData });

              // Notify the request owner
              const notification = await db.notification.create({
                data: {
                  userId: existing.userId,
                  type: 'GENERAL',
                  title: 'Request Updated (Bulk)',
                  message: `Your request "${existing.title}" has been bulk-updated${bulkStatus ? ` to ${bulkStatus.toLowerCase()}` : ''}${bulkComment ? `: ${bulkComment}` : ''}`,
                },
              });
              // Push real-time notification
              emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
                id: notification.id, userId: existing.userId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
              }).catch(() => {});
              if (bulkStatus) {
                emitRealtimeEvent(existing.userId, RealtimeEvents.REQUEST_STATUS_CHANGED, { requestId: reqId, status: bulkStatus.toUpperCase(), comment: bulkComment }).catch(() => {});
              }

              updatedCount++;
            } catch {
              // Skip failed individual updates
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `${updatedCount} request(s) updated`,
            data: { updatedCount, totalRequested: ids.length },
          });
        });
      }

      // ─── bulk-delete ────────────────────────────────────────
      if (action === 'bulk-delete') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { ids } = body;
          if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ status: 'error', message: 'ids array is required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;

          if (user.role.toLowerCase() === 'manager') {
            if (!deptId) {
              return NextResponse.json({ status: 'error', message: 'No department found for manager' }, { status: 404 });
            }
            const outsideDept = await db.request.findMany({
              where: { id: { in: ids }, departmentId: { not: deptId } },
              select: { id: true },
            });
            if (outsideDept.length > 0) {
              return NextResponse.json(
                { status: 'error', message: `${outsideDept.length} request(s) do not belong to your department` },
                { status: 403 }
              );
            }
          }

          // Get owners for notifications before deletion
          const toDelete = await db.request.findMany({
            where: { id: { in: ids } },
            select: { id: true, userId: true, title: true },
          });

          const result = await db.request.deleteMany({
            where: { id: { in: ids } },
          });

          // Notify affected users
          const ownerGroups: Record<string, string[]> = {};
          toDelete.forEach(r => {
            if (!ownerGroups[r.userId]) ownerGroups[r.userId] = [];
            ownerGroups[r.userId].push(r.title || r.id);
          });
          for (const [ownerId, titles] of Object.entries(ownerGroups)) {
            const notification = await db.notification.create({
              data: {
                userId: ownerId,
                type: 'GENERAL',
                title: 'Request(s) Deleted',
                message: `${titles.length} of your request(s) have been deleted by a ${user.role}: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? ` and ${titles.length - 3} more` : ''}`,
              },
            });
            // Push real-time notification
            emitRealtimeEvent(ownerId, RealtimeEvents.NOTIFICATION_NEW, {
              id: notification.id, userId: ownerId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
            }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: `${result.count} request(s) deleted`,
            data: { deletedCount: result.count, totalRequested: ids.length },
          });
        });
      }

      // ─── request-report (PATCH variant) ─────────────────────
      if (action === 'request-report') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;
          const where: Record<string, unknown> = {};
          if (deptId) where.departmentId = deptId;
          if (body.startDate || body.endDate) {
            const createdAt: Record<string, Date> = {};
            if (body.startDate) createdAt.gte = new Date(body.startDate);
            if (body.endDate) createdAt.lte = new Date(body.endDate);
            where.createdAt = createdAt;
          }

          const allRequests = await db.request.findMany({
            where,
            include: {
              user: { select: { id: true, name: true, email: true } },
              reviewer: { select: { id: true, name: true, email: true } },
            },
          });

          const total = allRequests.length;
          const approved = allRequests.filter(r => r.status === 'APPROVED').length;
          const rejected = allRequests.filter(r => r.status === 'REJECTED').length;
          const pending = allRequests.filter(r => r.status === 'PENDING').length;
          const underReview = allRequests.filter(r => r.status === 'UNDER_REVIEW').length;

          const resolved = approved + rejected;
          const approvalRate = resolved > 0 ? Math.round((approved / resolved) * 100) : 0;

          // Average response time
          const resolvedReqs = allRequests.filter(r => r.reviewedAt && r.createdAt);
          const avgMs = resolvedReqs.length > 0
            ? resolvedReqs.reduce((s, r) => s + (new Date(r.reviewedAt!).getTime() - new Date(r.createdAt).getTime()), 0) / resolvedReqs.length
            : 0;
          const avgResponseHours = Math.round(avgMs / 3600000 * 10) / 10;

          // Expense totals
          const expenseReqs = allRequests.filter(r => r.type === 'EXPENSE');
          const totalExpense = expenseReqs.reduce((s, r) => s + (r.amount || 0), 0);

          // Type distribution
          const typeDistribution: Record<string, number> = {};
          allRequests.forEach(r => {
            typeDistribution[r.type.toLowerCase()] = (typeDistribution[r.type.toLowerCase()] || 0) + 1;
          });

          return NextResponse.json({
            status: 'success',
            data: {
              overview: { total, approved, rejected, pending, underReview, approvalRate, avgResponseHours, totalExpenseAmount: totalExpense },
              typeDistribution,
            },
          });
        });
      }

      // ═══════════════════════════════════════════════════════════
      // Enterprise actions that operate on a single request `id`
      // ═══════════════════════════════════════════════════════════

      // ─── delegate ───────────────────────────────────────────
      if (action === 'delegate') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { id: requestId, delegateToId, delegationNote } = body;
          if (!requestId || !delegateToId || !delegationNote) {
            return NextResponse.json({ status: 'error', message: 'id, delegateToId, and delegationNote are required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;
          if (user.role.toLowerCase() === 'manager' && deptId) {
            const { error, req } = await verifyRequestInDepartment(requestId, deptId);
            if (error) return error;
            if (!req) return NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 });
          }

          // Verify delegate is a manager
          const delegateUser = await db.user.findUnique({ where: { id: delegateToId } });
          if (!delegateUser || !['MANAGER', 'ADMIN'].includes(delegateUser.role)) {
            return NextResponse.json({ status: 'error', message: 'Delegate must be a manager or admin' }, { status: 400 });
          }

          const existing = await db.request.findUnique({ where: { id: requestId } });
          if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 });
          }

          const updated = await db.request.update({
            where: { id: requestId },
            data: {
              reviewerId: delegateToId,
              reviewComment: appendToReviewComment(existing.reviewComment, 'Delegation', `Delegated from ${user.email} to ${delegateUser.email}: ${delegationNote}`),
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
              reviewer: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          });

          // Notify delegate
          const delegateNotification = await db.notification.create({
            data: {
              userId: delegateToId,
              type: 'APPROVAL_REQUIRED',
              title: 'Request Delegated to You',
              message: `A ${existing.type.toLowerCase()} request "${existing.title}" has been delegated to you by ${user.email}. Note: ${delegationNote}`,
              actionUrl: '/requests',
            },
          });
          // Push real-time notification to delegate
          emitRealtimeEvent(delegateToId, RealtimeEvents.NOTIFICATION_NEW, {
            id: delegateNotification.id, userId: delegateToId, title: delegateNotification.title, message: delegateNotification.message, type: delegateNotification.type, createdAt: delegateNotification.createdAt,
          }).catch(() => {});

          // Notify request owner
          const ownerNotification = await db.notification.create({
            data: {
              userId: existing.userId,
              type: 'GENERAL',
              title: 'Request Delegated',
              message: `Your request "${existing.title}" has been delegated to another manager for review. Note: ${delegationNote}`,
            },
          });
          // Push real-time notification to owner
          emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: ownerNotification.id, userId: existing.userId, title: ownerNotification.title, message: ownerNotification.message, type: ownerNotification.type, createdAt: ownerNotification.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Request delegated successfully',
            data: updated,
          });
        });
      }

      // ─── return-for-revision ────────────────────────────────
      if (action === 'return-for-revision') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { id: requestId, reason } = body;
          if (!requestId || !reason) {
            return NextResponse.json({ status: 'error', message: 'id and reason are required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;
          if (user.role.toLowerCase() === 'manager' && deptId) {
            const { error } = await verifyRequestInDepartment(requestId, deptId);
            if (error) return error;
          }

          const existing = await db.request.findUnique({ where: { id: requestId } });
          if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 });
          }

          if (!['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'ESCALATED'].includes(existing.status)) {
            return NextResponse.json(
              { status: 'error', message: 'Only approved, rejected, under review, or escalated requests can be returned for revision' },
              { status: 400 }
            );
          }

          const updated = await db.request.update({
            where: { id: requestId },
            data: {
              status: 'PENDING',
              reviewerId: null,
              reviewedAt: null,
              resolvedAt: null,
              reviewComment: appendToReviewComment(existing.reviewComment, 'Return for Revision', `Returned from ${existing.status} to PENDING. Reason: ${reason}`),
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
              reviewer: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          });

          // Notify request owner
          const revisionNotification = await db.notification.create({
            data: {
              userId: existing.userId,
              type: 'GENERAL',
              title: 'Request Returned for Revision',
              message: `Your request "${existing.title}" has been returned to pending for revision. Reason: ${reason}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: revisionNotification.id, userId: existing.userId, title: revisionNotification.title, message: revisionNotification.message, type: revisionNotification.type, createdAt: revisionNotification.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(existing.userId, RealtimeEvents.REQUEST_STATUS_CHANGED, { requestId: existing.id, status: 'PENDING', comment: reason }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Request returned for revision',
            data: updated,
          });
        });
      }

      // ─── add-comment ────────────────────────────────────────
      if (action === 'add-comment') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { id: requestId, comment } = body;
          if (!requestId || !comment) {
            return NextResponse.json({ status: 'error', message: 'id and comment are required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;
          if (user.role.toLowerCase() === 'manager' && deptId) {
            const { error } = await verifyRequestInDepartment(requestId, deptId);
            if (error) return error;
          }

          const existing = await db.request.findUnique({ where: { id: requestId } });
          if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 });
          }

          const updated = await db.request.update({
            where: { id: requestId },
            data: {
              reviewComment: appendToReviewComment(existing.reviewComment, `Comment by ${user.email}`, comment),
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
              reviewer: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          });

          // Notify request owner about the internal comment
          const commentNotification = await db.notification.create({
            data: {
              userId: existing.userId,
              type: 'GENERAL',
              title: 'Comment Added to Your Request',
              message: `A comment was added to your request "${existing.title}": "${comment}"`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: commentNotification.id, userId: existing.userId, title: commentNotification.title, message: commentNotification.message, type: commentNotification.type, createdAt: commentNotification.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Comment added successfully',
            data: updated,
          });
        });
      }

      // ─── conditional-approve ────────────────────────────────
      if (action === 'conditional-approve') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { id: requestId, conditions } = body;
          if (!requestId || !conditions) {
            return NextResponse.json({ status: 'error', message: 'id and conditions are required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;
          if (user.role.toLowerCase() === 'manager' && deptId) {
            const { error } = await verifyRequestInDepartment(requestId, deptId);
            if (error) return error;
          }

          const existing = await db.request.findUnique({ where: { id: requestId } });
          if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 });
          }

          if (!['PENDING', 'UNDER_REVIEW'].includes(existing.status)) {
            return NextResponse.json(
              { status: 'error', message: 'Only pending or under review requests can be conditionally approved' },
              { status: 400 }
            );
          }

          const updated = await db.request.update({
            where: { id: requestId },
            data: {
              status: 'APPROVED',
              reviewerId,
              reviewedAt: new Date(),
              resolvedAt: new Date(),
              reviewComment: appendToReviewComment(existing.reviewComment, 'Conditional Approval', `Conditionally APPROVED with conditions: ${conditions}`),
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
              reviewer: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          });

          // Notify request owner
          const condNotif = await db.notification.create({
            data: {
              userId: existing.userId,
              type: 'GENERAL',
              title: 'Request Conditionally Approved',
              message: `Your request "${existing.title}" has been conditionally approved. Conditions: ${conditions}`,
            },
          });
          // Push real-time notification
          emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: condNotif.id, userId: existing.userId, title: condNotif.title, message: condNotif.message, type: condNotif.type, createdAt: condNotif.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(existing.userId, RealtimeEvents.REQUEST_STATUS_CHANGED, { requestId: existing.id, status: 'CONDITIONALLY_APPROVED', comment: conditions }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Request conditionally approved',
            data: { ...updated, conditionalApproval: true, conditions },
          });
        });
      }

      // ─── request-more-info ──────────────────────────────────
      if (action === 'request-more-info') {
        return requireRole(request, ['manager', 'admin'], async () => {
          const { id: requestId, message: infoMessage } = body;
          if (!requestId || !infoMessage) {
            return NextResponse.json({ status: 'error', message: 'id and message are required' }, { status: 400 });
          }

          const deptId = user.role.toLowerCase() === 'manager' ? await getManagerDepartmentId(user.userId) : null;
          if (user.role.toLowerCase() === 'manager' && deptId) {
            const { error } = await verifyRequestInDepartment(requestId, deptId);
            if (error) return error;
          }

          const existing = await db.request.findUnique({ where: { id: requestId } });
          if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Request not found' }, { status: 404 });
          }

          if (!['PENDING', 'UNDER_REVIEW'].includes(existing.status)) {
            return NextResponse.json(
              { status: 'error', message: 'Only pending or under review requests can have info requested' },
              { status: 400 }
            );
          }

          const updated = await db.request.update({
            where: { id: requestId },
            data: {
              status: 'UNDER_REVIEW',
              reviewerId,
              reviewComment: appendToReviewComment(existing.reviewComment, 'Info Request', `Additional information requested: ${infoMessage}`),
            },
            include: {
              user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
              reviewer: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          });

          // Notify request owner
          const infoNotif = await db.notification.create({
            data: {
              userId: existing.userId,
              type: 'GENERAL',
              title: 'Additional Information Required',
              message: `Additional information is requested for your request "${existing.title}": ${infoMessage}`,
              actionUrl: '/requests',
            },
          });
          // Push real-time notification
          emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
            id: infoNotif.id, userId: existing.userId, title: infoNotif.title, message: infoNotif.message, type: infoNotif.type, createdAt: infoNotif.createdAt,
          }).catch(() => {});

          return NextResponse.json({
            status: 'success',
            message: 'Information request sent',
            data: updated,
          });
        });
      }

      // ═══════════════════════════════════════════════════════════
      // Original PATCH logic (status update, cancel, edit)
      // ═══════════════════════════════════════════════════════════

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Request ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.request.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Request not found' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};

      if (status) {
        const validStatuses = ['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'CANCELLED', 'ESCALATED'];
        if (!validStatuses.includes(status.toUpperCase())) {
          return NextResponse.json(
            { status: 'error', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
            { status: 400 }
          );
        }

        const upperStatus = status.toUpperCase();
        updateData.status = upperStatus;
        updateData.reviewerId = reviewerId;
        updateData.reviewedAt = new Date();

        if (reviewComment) {
          updateData.reviewComment = reviewComment;
        }

        // Set timestamps based on status
        if (upperStatus === 'APPROVED') {
          updateData.resolvedAt = new Date();
        } else if (upperStatus === 'CANCELLED') {
          updateData.cancelledAt = new Date();
        } else if (upperStatus === 'ESCALATED') {
          updateData.escalatedAt = new Date();
          updateData.escalatedBy = reviewerId;
        }
      }

      // Handle employee cancellation
      if (action === 'cancel' && user.role.toLowerCase() === 'employee') {
        if (existing.userId !== user.userId) {
          return NextResponse.json(
            { status: 'error', message: 'You can only cancel your own requests' },
            { status: 403 }
          );
        }
        if (existing.status !== 'PENDING') {
          return NextResponse.json(
            { status: 'error', message: 'Only pending requests can be cancelled' },
            { status: 400 }
          );
        }
        updateData.status = 'CANCELLED';
        updateData.cancelledAt = new Date();
      }

      // Handle employee edit of pending request
      if (action === 'edit' && user.role.toLowerCase() === 'employee') {
        if (existing.userId !== user.userId) {
          return NextResponse.json(
            { status: 'error', message: 'You can only edit your own requests' },
            { status: 403 }
          );
        }
        if (existing.status !== 'PENDING') {
          return NextResponse.json(
            { status: 'error', message: 'Only pending requests can be edited' },
            { status: 400 }
          );
        }
        if (body.title) updateData.title = body.title;
        if (body.description) updateData.description = body.description;
        if (body.amount !== undefined) updateData.amount = parseFloat(String(body.amount)) || null;
        if (body.priority) updateData.priority = body.priority.toUpperCase();
        if (body.dueDate) updateData.dueDate = body.dueDate;
        if (body.type) updateData.type = body.type.toUpperCase();
      }

      // Only admin/manager can approve/reject/escalate
      if (status && ['APPROVED', 'REJECTED', 'ESCALATED'].includes(status.toUpperCase())) {
        if (!['admin', 'manager'].includes(user.role.toLowerCase())) {
          return NextResponse.json(
            { status: 'error', message: 'Only managers and admins can approve, reject, or escalate requests' },
            { status: 403 }
          );
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { status: 'error', message: 'No updates provided' },
          { status: 400 }
        );
      }

      const req = await db.request.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
          reviewer: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      });

      // Create notification for status changes
      if (status && existing.userId !== reviewerId) {
        const statusNotif = await db.notification.create({
          data: {
            userId: existing.userId,
            type: 'GENERAL',
            title: `Request ${status.toLowerCase()}`,
            message: `Your request "${existing.title}" has been ${status.toLowerCase()}${reviewComment ? `: ${reviewComment}` : ''}`,
          },
        });
        // Push real-time notification
        emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
          id: statusNotif.id, userId: existing.userId, title: statusNotif.title, message: statusNotif.message, type: statusNotif.type, createdAt: statusNotif.createdAt,
        }).catch(() => {});
        emitRealtimeEvent(existing.userId, RealtimeEvents.REQUEST_STATUS_CHANGED, { requestId: existing.id, status: status.toUpperCase(), comment: reviewComment }).catch(() => {});
      }

      return NextResponse.json({
        status: 'success',
        message: 'Request updated successfully',
        data: req,
      });
    } catch (error) {
      console.error('Requests PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update request' },
        { status: 500 }
      );
    }
  });
}
