import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const assigneeId = searchParams.get('assigneeId');
      const departmentId = searchParams.get('departmentId');
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const reporterId = searchParams.get('reporterId');
      const scope = searchParams.get('scope'); // 'mine' for employee self-scoping

      const role = user.role.toLowerCase();
      const where: Record<string, unknown> = {};

      // ─── Role-based row-level scoping ─────────────────────────
      if (role === 'employee') {
        // Employees only see tasks they're assigned to or reported
        where.OR = [
          { assigneeId: user.userId },
          { reporterId: user.userId },
        ];
      } else if (role === 'manager') {
        // Managers see their department's tasks + tasks they're assigned/reported
        const mgr = await db.user.findUnique({
          where: { id: user.userId },
          select: { departmentId: true },
        });
        if (mgr?.departmentId) {
          where.OR = [
            { departmentId: mgr.departmentId },
            { assigneeId: user.userId },
            { reporterId: user.userId },
          ];
        }
      }
      // Admin sees all tasks (no filter)

      // ─── Explicit filters (applied on top of role scope) ──────
      if (assigneeId) where.assigneeId = assigneeId;
      if (departmentId) where.departmentId = departmentId;
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (reporterId) where.reporterId = reporterId;
      if (scope === 'mine') {
        // Override to only user's own tasks regardless of role
        delete where.OR;
        where.OR = [
          { assigneeId: user.userId },
          { reporterId: user.userId },
        ];
      }

      // ─── Field-level scoping: strip performanceScore for employees ──
      const includeConfig = {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
        subTasks: {
          include: {
            assignee: { select: { id: true, name: true } },
          },
        },
        _count: { select: { comments: true } },
      };

      const tasks = await db.task.findMany({
        where,
        include: includeConfig,
        orderBy: { createdAt: 'desc' },
      });

      // Strip performanceScore for non-admin/non-manager roles
      const sanitized = role === 'employee'
        ? tasks.map(({ performanceScore, ...rest }) => rest)
        : tasks;

      return NextResponse.json({
        status: 'success',
        message: 'Tasks fetched successfully',
        data: sanitized,
      });
    } catch (error) {
      console.error('Tasks GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (_user) => {
    try {
      const body = await request.json();
      const { title, description, assigneeId, reporterId, departmentId, teamId, parentTaskId, status, priority, dueDate } = body;

      if (!title) {
        return NextResponse.json(
          { status: 'error', message: 'Task title is required' },
          { status: 400 }
        );
      }

      const task = await db.task.create({
        data: {
          title,
          description: description || null,
          assigneeId: assigneeId || null,
          reporterId: reporterId || null,
          departmentId: departmentId || null,
          teamId: teamId || null,
          parentTaskId: parentTaskId || null,
          status: status || 'TODO',
          priority: priority || 'MEDIUM',
          dueDate: dueDate || null,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          reporter: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
          team: { select: { id: true, name: true, color: true } },
        },
      });

      return NextResponse.json(
        {
          status: 'success',
          message: 'Task created successfully',
          data: task,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Tasks POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create task' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, title, description, assigneeId, reporterId, departmentId, status, priority, dueDate, isBlocked, blockedReason, teamId } = body;

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Task ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.task.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Task not found' },
          { status: 404 }
        );
      }

      const data: Record<string, unknown> = {};

      // Employees can update status and report blockers
      if (user.role.toLowerCase() === 'employee') {
        if (status !== undefined) data.status = status;
        if (isBlocked !== undefined) data.isBlocked = isBlocked;
        if (blockedReason !== undefined) data.blockedReason = blockedReason || null;
        // Auto-set completedAt when status changes to DONE
        if (status === 'DONE' && existing.status !== 'DONE') data.completedAt = new Date();
      } else {
        // Admin/manager can update everything
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (assigneeId !== undefined) data.assigneeId = assigneeId;
        if (reporterId !== undefined) data.reporterId = reporterId;
        if (departmentId !== undefined) data.departmentId = departmentId;
        if (status !== undefined) data.status = status;
        if (priority !== undefined) data.priority = priority;
        if (dueDate !== undefined) data.dueDate = dueDate;
        if (isBlocked !== undefined) data.isBlocked = isBlocked;
        if (blockedReason !== undefined) data.blockedReason = blockedReason || null;
        if (teamId !== undefined) data.teamId = teamId || null;
        // Auto-set completedAt when status changes to DONE
        if (status === 'DONE' && existing.status !== 'DONE') data.completedAt = new Date();
      }

      const task = await db.task.update({
        where: { id },
        data,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          reporter: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Task updated successfully',
        data: task,
      });
    } catch (error) {
      console.error('Tasks PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update task' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (_user) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Task ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.task.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Task not found' },
          { status: 404 }
        );
      }

      await db.task.delete({ where: { id } });

      return NextResponse.json({
        status: 'success',
        message: 'Task deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Tasks DELETE error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to delete task' },
        { status: 500 }
      );
    }
  });
}
