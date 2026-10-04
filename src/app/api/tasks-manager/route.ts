import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { emitRealtimeEvent, RealtimeEvents } from '@/lib/realtime';

// Helper: get manager's departmentId
async function getManagerDepartment(managerId: string): Promise<string | null> {
  const manager = await db.user.findUnique({
    where: { id: managerId },
    select: { departmentId: true },
  });
  return manager?.departmentId || null;
}

// Helper: create a notification and push real-time event
async function createNotification(userId: string, type: string, title: string, message: string, actionUrl?: string) {
  try {
    const notification = await db.notification.create({
      data: { userId, type, title, message, actionUrl: actionUrl || null },
    });
    // Push real-time notification
    emitRealtimeEvent(userId, RealtimeEvents.NOTIFICATION_NEW, {
      id: notification.id, userId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// Helper: normalize task for response
function normalizeTask(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    status: (t.status || 'TODO').toLowerCase().replace(/_/g, '-'),
    priority: (t.priority || 'MEDIUM').toLowerCase(),
    assigneeId: t.assigneeId || undefined,
    assigneeName: t.assignee?.name || undefined,
    reporterId: t.reporterId || undefined,
    reporterName: t.reporter?.name || undefined,
    departmentId: t.departmentId || undefined,
    teamId: t.teamId || undefined,
    teamName: t.team?.name || undefined,
    parentTaskId: t.parentTaskId || undefined,
    isBlocked: t.isBlocked ?? false,
    blockedReason: t.blockedReason || undefined,
    performanceScore: t.performanceScore || undefined,
    completedAt: t.completedAt || undefined,
    dueDate: t.dueDate || undefined,
    createdAt: t.createdAt,
    commentCount: t._count?.comments ?? t.comments?.length ?? 0,
    comments: t.comments
      ? t.comments.map((c: any) => ({
          id: c.id,
          taskId: c.taskId,
          userId: c.userId,
          comment: c.comment,
          userName: c.user?.name || undefined,
          createdAt: c.createdAt,
        }))
      : undefined,
    subTasks: t.subTasks ? t.subTasks.map(normalizeTask) : undefined,
  };
}

// POST /api/tasks-manager — Manager-specific task operations
export async function POST(request: NextRequest) {
  return requireRole(request, ['manager'], async (user) => {
    try {
      const body = await request.json();
      const { action } = body;
      const managerId = user.userId;

      // Get manager's department
      const departmentId = await getManagerDepartment(managerId);
      if (!departmentId) {
        return NextResponse.json(
          { status: 'error', message: 'Manager is not assigned to a department' },
          { status: 400 }
        );
      }

      switch (action) {
        // ─────────────────────────────────────────────────────────────
        // 1. DASHBOARD
        // ─────────────────────────────────────────────────────────────
        case 'dashboard': {
          const today = new Date().toISOString().split('T')[0];

          // Team members in manager's department
          const teamMembers = await db.user.findMany({
            where: { departmentId, isActive: true },
            select: { id: true, name: true, email: true },
          });
          const teamUserIds = teamMembers.map((u) => u.id);

          // Department info
          const department = await db.department.findUnique({
            where: { id: departmentId },
            select: { name: true },
          });

          // All tasks for the department
          const tasks = await db.task.findMany({
            where: { departmentId },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              reporter: { select: { id: true, name: true, email: true } },
              team: { select: { id: true, name: true, color: true } },
              subTasks: {
                include: {
                  assignee: { select: { id: true, name: true } },
                },
              },
              comments: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
              _count: { select: { comments: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          // Status counts
          const todoCount = tasks.filter((t) => t.status === 'TODO').length;
          const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
          const inReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length;
          const doneCount = tasks.filter((t) => t.status === 'DONE').length;
          const blockedCount = tasks.filter((t) => t.isBlocked).length;

          // Overdue tasks
          const overdueTasks = tasks.filter(
            (t) => t.dueDate && t.dueDate < today && t.status !== 'DONE'
          );
          const overdueCount = overdueTasks.length;

          // Completed this week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const completedThisWeek = tasks.filter(
            (t) => t.completedAt && new Date(t.completedAt) >= weekStart
          ).length;

          // Average completion time
          const completedTasks = tasks.filter(
            (t) => t.status === 'DONE' && t.completedAt
          );
          let avgCompletionDays = 0;
          if (completedTasks.length > 0) {
            const totalDays = completedTasks.reduce((sum, t) => {
              const created = new Date(t.createdAt);
              const completed = new Date(t.completedAt!);
              const diff = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
              return sum + diff;
            }, 0);
            avgCompletionDays = Math.round((totalDays / completedTasks.length) * 10) / 10;
          }

          // Velocity data (last 4 weeks)
          const velocityData = [];
          for (let i = 3; i >= 0; i--) {
            const weekBegin = new Date();
            weekBegin.setDate(weekBegin.getDate() - weekBegin.getDay() - i * 7);
            weekBegin.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekBegin);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const completed = tasks.filter(
              (t) =>
                t.completedAt &&
                new Date(t.completedAt) >= weekBegin &&
                new Date(t.completedAt) < weekEnd
            ).length;

            const created = tasks.filter(
              (t) =>
                new Date(t.createdAt) >= weekBegin &&
                new Date(t.createdAt) < weekEnd
            ).length;

            velocityData.push({
              week: weekBegin.toISOString().split('T')[0],
              completed,
              created,
            });
          }

          // Workload data: tasks per member
          const workloadData = teamMembers.map((member) => {
            const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
            return {
              userId: member.id,
              userName: member.name,
              total: memberTasks.length,
              todo: memberTasks.filter((t) => t.status === 'TODO').length,
              inProgress: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
              done: memberTasks.filter((t) => t.status === 'DONE').length,
            };
          });

          // Review queue (IN_REVIEW tasks)
          const reviewQueue = tasks
            .filter((t) => t.status === 'IN_REVIEW')
            .map(normalizeTask);

          // Recent activity (last 10 task comments + status changes)
          const recentComments = await db.taskComment.findMany({
            where: {
              task: { departmentId },
            },
            include: {
              user: { select: { id: true, name: true } },
              task: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

          const recentActivity = recentComments.map((c) => ({
            taskId: c.taskId,
            taskTitle: c.task?.title || 'Unknown',
            action: c.comment.startsWith('[TIME]') ? 'time-entry' : 'commented',
            userName: c.user?.name || 'Unknown',
            timestamp: c.createdAt.toISOString(),
          }));

          return NextResponse.json({
            status: 'success',
            data: {
              departmentName: department?.name || 'N/A',
              teamSize: teamMembers.length,
              metrics: {
                totalTasks: tasks.length,
                todoCount,
                inProgressCount,
                inReviewCount,
                doneCount,
                blockedCount,
                overdueCount,
                completedThisWeek,
                avgCompletionDays,
              },
              velocityData,
              workloadData,
              tasks: tasks.map(normalizeTask),
              reviewQueue,
              recentActivity,
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 2. BULK-UPDATE
        // ─────────────────────────────────────────────────────────────
        case 'bulk-update': {
          const { taskIds, updates } = body;
          if (!taskIds || !Array.isArray(taskIds) || !updates) {
            return NextResponse.json(
              { status: 'error', message: 'taskIds array and updates object are required' },
              { status: 400 }
            );
          }

          // Verify all tasks belong to manager's department
          const tasksToUpdate = await db.task.findMany({
            where: { id: { in: taskIds }, departmentId },
          });
          const validIds = tasksToUpdate.map((t) => t.id);
          const invalidIds = taskIds.filter((id: string) => !validIds.includes(id));

          // Build update data
          const updateData: Record<string, unknown> = {};
          if (updates.status) updateData.status = updates.status.toUpperCase().replace(/-/g, '_');
          if (updates.priority) updateData.priority = updates.priority.toUpperCase();
          if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId || null;
          if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate || null;

          let successCount = 0;
          let failCount = 0;

          for (const id of validIds) {
            try {
              await db.task.update({
                where: { id },
                data: updateData,
              });
              successCount++;
            } catch {
              failCount++;
            }
          }

          // Create notifications for affected assignees
          if (updates.assigneeId) {
            await createNotification(
              updates.assigneeId,
              'TASK_ASSIGNED',
              'Task Assigned',
              `You have been assigned ${validIds.length} task(s)`
            );
            // Emit task assigned event
            emitRealtimeEvent(updates.assigneeId, RealtimeEvents.TASK_ASSIGNED, { taskId: null, assigneeId: updates.assigneeId, assigneeName: null }).catch(() => {});
          }

          if (updates.status) {
            // Notify assignees of status changes
            const affectedTasks = await db.task.findMany({
              where: { id: { in: validIds } },
              select: { assigneeId: true },
            });
            const assigneeIds = [...new Set(affectedTasks.map((t) => t.assigneeId).filter(Boolean))] as string[];
            for (const aid of assigneeIds) {
              await createNotification(
                aid,
                'TASK_ASSIGNED',
                'Task Status Updated',
                `${validIds.length} task(s) status updated to ${updates.status}`
              );
              // Emit task status changed event
              emitRealtimeEvent(aid, RealtimeEvents.TASK_STATUS_CHANGED, { taskId: null, status: updates.status.toUpperCase() }).catch(() => {});
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `${successCount} tasks updated, ${failCount} failed`,
            data: {
              successCount,
              failCount,
              invalidIds,
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 3. BULK-DELETE
        // ─────────────────────────────────────────────────────────────
        case 'bulk-delete': {
          const { taskIds } = body;
          if (!taskIds || !Array.isArray(taskIds)) {
            return NextResponse.json(
              { status: 'error', message: 'taskIds array is required' },
              { status: 400 }
            );
          }

          // Verify all tasks belong to manager's department
          const tasksToDelete = await db.task.findMany({
            where: { id: { in: taskIds }, departmentId },
            select: { id: true, assigneeId: true },
          });
          const validIds = tasksToDelete.map((t) => t.id);
          const invalidIds = taskIds.filter((id: string) => !validIds.includes(id));

          let successCount = 0;
          let failCount = 0;

          for (const id of validIds) {
            try {
              // Delete comments first (cascade should handle, but be safe)
              await db.taskComment.deleteMany({ where: { taskId: id } });
              await db.task.delete({ where: { id } });
              successCount++;
            } catch {
              failCount++;
            }
          }

          // Notify affected assignees
          const affectedAssigneeIds = [
            ...new Set(tasksToDelete.map((t) => t.assigneeId).filter(Boolean)),
          ] as string[];
          for (const aid of affectedAssigneeIds) {
            await createNotification(
              aid,
              'TASK_ASSIGNED',
              'Task Deleted',
              `${validIds.length} task(s) have been removed from your department`
            );
          }

          return NextResponse.json({
            status: 'success',
            message: `${successCount} tasks deleted, ${failCount} failed`,
            data: {
              successCount,
              failCount,
              invalidIds,
            },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 4. CREATE-FROM-TEMPLATE
        // ─────────────────────────────────────────────────────────────
        case 'create-from-template': {
          const { templateId, overrides } = body;
          if (!templateId) {
            return NextResponse.json(
              { status: 'error', message: 'templateId is required' },
              { status: 400 }
            );
          }

          // Read template
          const template = await db.taskTemplate.findUnique({ where: { id: templateId } });
          if (!template) {
            return NextResponse.json(
              { status: 'error', message: 'Template not found' },
              { status: 404 }
            );
          }

          // Parse taskItems JSON
          let taskItems: string[] = [];
          try {
            taskItems = JSON.parse(template.taskItems);
            if (!Array.isArray(taskItems)) taskItems = [];
          } catch {
            taskItems = [];
          }

          if (taskItems.length === 0) {
            return NextResponse.json(
              { status: 'error', message: 'Template has no task items' },
              { status: 400 }
            );
          }

          // Create tasks for each item
          const createdTasks = [];
          for (const itemTitle of taskItems) {
            const task = await db.task.create({
              data: {
                title: itemTitle,
                description: `Created from template: ${template.name}`,
                assigneeId: overrides?.assigneeId || null,
                dueDate: overrides?.dueDate || null,
                departmentId,
                reporterId: managerId,
                status: 'TODO',
                priority: 'MEDIUM',
              },
              include: {
                assignee: { select: { id: true, name: true, email: true } },
                reporter: { select: { id: true, name: true, email: true } },
              },
            });
            createdTasks.push(normalizeTask(task));
          }

          // Notify assignee if set
          if (overrides?.assigneeId) {
            await createNotification(
              overrides.assigneeId,
              'TASK_ASSIGNED',
              'Tasks Created from Template',
              `${createdTasks.length} task(s) created from template "${template.name}" have been assigned to you`
            );
            // Emit task assigned event
            for (const ct of createdTasks) {
              emitRealtimeEvent(overrides.assigneeId, RealtimeEvents.TASK_ASSIGNED, { taskId: ct.id, assigneeId: overrides.assigneeId, assigneeName: null }).catch(() => {});
            }
          }

          return NextResponse.json({
            status: 'success',
            message: `${createdTasks.length} tasks created from template`,
            data: { createdTasks, templateName: template.name },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 5. APPROVE-TASK
        // ─────────────────────────────────────────────────────────────
        case 'approve-task': {
          const { taskId, performanceScore, comment } = body;
          if (!taskId) {
            return NextResponse.json(
              { status: 'error', message: 'taskId is required' },
              { status: 400 }
            );
          }

          const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignee: { select: { id: true, name: true } } },
          });

          if (!task || task.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Task not found or not in your department' },
              { status: 404 }
            );
          }

          if (task.status !== 'IN_REVIEW') {
            return NextResponse.json(
              { status: 'error', message: 'Task must be in IN_REVIEW status to approve' },
              { status: 400 }
            );
          }

          // Update task
          const updatePayload: Record<string, unknown> = {
            status: 'DONE',
            completedAt: new Date(),
          };
          if (performanceScore !== undefined && performanceScore !== null) {
            updatePayload.performanceScore = performanceScore;
          }

          const updatedTask = await db.task.update({
            where: { id: taskId },
            data: updatePayload,
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              reporter: { select: { id: true, name: true, email: true } },
            },
          });

          // Add system comment about approval
          const approvalComment = `✅ Task approved by manager${performanceScore ? ` (Score: ${performanceScore}/100)` : ''}${comment ? ` — ${comment}` : ''}`;
          await db.taskComment.create({
            data: {
              taskId,
              userId: managerId,
              comment: approvalComment,
            },
          });

          // Create notification for assignee
          if (task.assigneeId) {
            await createNotification(
              task.assigneeId,
              'TASK_ASSIGNED',
              'Task Approved',
              `"${task.title}" has been approved${performanceScore ? ` with score ${performanceScore}/100` : ''}`
            );
            // Emit task status changed event
            emitRealtimeEvent(task.assigneeId, RealtimeEvents.TASK_STATUS_CHANGED, { taskId, status: 'DONE' }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Task approved successfully',
            data: normalizeTask(updatedTask),
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 6. REQUEST-CHANGES
        // ─────────────────────────────────────────────────────────────
        case 'request-changes': {
          const { taskId, comment: changeComment } = body;
          if (!taskId || !changeComment) {
            return NextResponse.json(
              { status: 'error', message: 'taskId and comment are required' },
              { status: 400 }
            );
          }

          const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignee: { select: { id: true, name: true } } },
          });

          if (!task || task.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Task not found or not in your department' },
              { status: 404 }
            );
          }

          if (task.status !== 'IN_REVIEW') {
            return NextResponse.json(
              { status: 'error', message: 'Task must be in IN_REVIEW status to request changes' },
              { status: 400 }
            );
          }

          // Set status back to IN_PROGRESS
          const updatedTask = await db.task.update({
            where: { id: taskId },
            data: { status: 'IN_PROGRESS' },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              reporter: { select: { id: true, name: true, email: true } },
            },
          });

          // Add comment with change request
          await db.taskComment.create({
            data: {
              taskId,
              userId: managerId,
              comment: `🔄 Changes requested: ${changeComment}`,
            },
          });

          // Create notification for assignee
          if (task.assigneeId) {
            await createNotification(
              task.assigneeId,
              'TASK_ASSIGNED',
              'Changes Requested',
              `Changes requested on "${task.title}": ${changeComment}`
            );
            // Emit task status changed event
            emitRealtimeEvent(task.assigneeId, RealtimeEvents.TASK_STATUS_CHANGED, { taskId, status: 'IN_PROGRESS' }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Changes requested, task moved back to IN_PROGRESS',
            data: normalizeTask(updatedTask),
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 7. ADD-TIME-ENTRY
        // ─────────────────────────────────────────────────────────────
        case 'add-time-entry': {
          const { taskId, hours, date, note } = body;
          if (!taskId || hours === undefined || !date) {
            return NextResponse.json(
              { status: 'error', message: 'taskId, hours, and date are required' },
              { status: 400 }
            );
          }

          const task = await db.task.findUnique({ where: { id: taskId } });

          if (!task || task.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Task not found or not in your department' },
              { status: 404 }
            );
          }

          // Store as a task comment with [TIME] format
          const timeComment = `[TIME] ${hours}h - ${date}${note ? ` — ${note}` : ''}`;
          await db.taskComment.create({
            data: {
              taskId,
              userId: managerId,
              comment: timeComment,
            },
          });

          return NextResponse.json({
            status: 'success',
            message: 'Time entry added successfully',
            data: { taskId, hours, date, note: note || null },
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 8. REASSIGN
        // ─────────────────────────────────────────────────────────────
        case 'reassign': {
          const { taskId, assigneeId: newAssigneeId, reason } = body;
          if (!taskId || !newAssigneeId) {
            return NextResponse.json(
              { status: 'error', message: 'taskId and assigneeId are required' },
              { status: 400 }
            );
          }

          const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignee: { select: { id: true, name: true } } },
          });

          if (!task || task.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Task not found or not in your department' },
              { status: 404 }
            );
          }

          // Verify new assignee is in manager's department
          const newAssignee = await db.user.findUnique({
            where: { id: newAssigneeId },
            select: { id: true, name: true, departmentId: true },
          });

          if (!newAssignee || newAssignee.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'New assignee is not in your department' },
              { status: 400 }
            );
          }

          const oldAssigneeId = task.assigneeId;
          const oldAssigneeName = task.assignee?.name || 'Unassigned';

          // Update task
          const updatedTask = await db.task.update({
            where: { id: taskId },
            data: { assigneeId: newAssigneeId },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              reporter: { select: { id: true, name: true, email: true } },
            },
          });

          // Add comment about reassignment
          await db.taskComment.create({
            data: {
              taskId,
              userId: managerId,
              comment: `👤 Task reassigned from ${oldAssigneeName} to ${newAssignee.name}${reason ? ` — ${reason}` : ''}`,
            },
          });

          // Notify new assignee
          await createNotification(
            newAssigneeId,
            'TASK_ASSIGNED',
            'Task Assigned to You',
            `"${task.title}" has been reassigned to you${reason ? `: ${reason}` : ''}`
          );
          // Emit task assigned event
          emitRealtimeEvent(newAssigneeId, RealtimeEvents.TASK_ASSIGNED, { taskId, assigneeId: newAssigneeId, assigneeName: newAssignee.name }).catch(() => {});

          // Notify old assignee
          if (oldAssigneeId && oldAssigneeId !== newAssigneeId) {
            await createNotification(
              oldAssigneeId,
              'TASK_ASSIGNED',
              'Task Reassigned',
              `"${task.title}" has been reassigned from you to ${newAssignee.name}`
            );
            // Emit task status changed event for old assignee
            emitRealtimeEvent(oldAssigneeId, RealtimeEvents.TASK_STATUS_CHANGED, { taskId, status: 'REASSIGNED' }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Task reassigned successfully',
            data: normalizeTask(updatedTask),
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 9. SET-DEPENDENCY
        // ─────────────────────────────────────────────────────────────
        case 'set-dependency': {
          const { taskId, blockedById } = body;
          if (!taskId || !blockedById) {
            return NextResponse.json(
              { status: 'error', message: 'taskId and blockedById are required' },
              { status: 400 }
            );
          }

          if (taskId === blockedById) {
            return NextResponse.json(
              { status: 'error', message: 'A task cannot block itself' },
              { status: 400 }
            );
          }

          // Verify both tasks are in manager's department
          const [task, blockingTask] = await Promise.all([
            db.task.findUnique({ where: { id: taskId }, include: { assignee: { select: { id: true, name: true } } } }),
            db.task.findUnique({ where: { id: blockedById }, select: { id: true, title: true, departmentId: true } }),
          ]);

          if (!task || task.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Task not found or not in your department' },
              { status: 404 }
            );
          }

          if (!blockingTask || blockingTask.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Blocking task not found or not in your department' },
              { status: 404 }
            );
          }

          // Update task
          const updatedTask = await db.task.update({
            where: { id: taskId },
            data: {
              isBlocked: true,
              blockedReason: `Blocked by task: ${blockingTask.title} (${blockedById})`,
            },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              reporter: { select: { id: true, name: true, email: true } },
            },
          });

          // Add comment
          await db.taskComment.create({
            data: {
              taskId,
              userId: managerId,
              comment: `🚫 Task blocked by: "${blockingTask.title}"`,
            },
          });

          // Notify assignee
          if (task.assigneeId) {
            await createNotification(
              task.assigneeId,
              'TASK_ASSIGNED',
              'Task Blocked',
              `"${task.title}" has been blocked by "${blockingTask.title}"`
            );
            // Emit task status changed event
            emitRealtimeEvent(task.assigneeId, RealtimeEvents.TASK_STATUS_CHANGED, { taskId, status: 'BLOCKED' }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Task dependency set successfully',
            data: normalizeTask(updatedTask),
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 10. RESOLVE-BLOCKER
        // ─────────────────────────────────────────────────────────────
        case 'resolve-blocker': {
          const { taskId, comment: resolveComment } = body;
          if (!taskId) {
            return NextResponse.json(
              { status: 'error', message: 'taskId is required' },
              { status: 400 }
            );
          }

          const task = await db.task.findUnique({
            where: { id: taskId },
            include: { assignee: { select: { id: true, name: true } } },
          });

          if (!task || task.departmentId !== departmentId) {
            return NextResponse.json(
              { status: 'error', message: 'Task not found or not in your department' },
              { status: 404 }
            );
          }

          if (!task.isBlocked) {
            return NextResponse.json(
              { status: 'error', message: 'Task is not currently blocked' },
              { status: 400 }
            );
          }

          // Resolve blocker
          const updatedTask = await db.task.update({
            where: { id: taskId },
            data: {
              isBlocked: false,
              blockedReason: null,
              status: 'IN_PROGRESS',
            },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              reporter: { select: { id: true, name: true, email: true } },
            },
          });

          // Add comment about resolution
          await db.taskComment.create({
            data: {
              taskId,
              userId: managerId,
              comment: `✅ Blocker resolved${resolveComment ? `: ${resolveComment}` : ''}. Task moved to IN_PROGRESS.`,
            },
          });

          // Notify assignee
          if (task.assigneeId) {
            await createNotification(
              task.assigneeId,
              'TASK_ASSIGNED',
              'Blocker Resolved',
              `Blocker on "${task.title}" has been resolved. Task is now IN_PROGRESS.`
            );
            // Emit task status changed event
            emitRealtimeEvent(task.assigneeId, RealtimeEvents.TASK_STATUS_CHANGED, { taskId, status: 'IN_PROGRESS' }).catch(() => {});
          }

          return NextResponse.json({
            status: 'success',
            message: 'Blocker resolved, task moved to IN_PROGRESS',
            data: normalizeTask(updatedTask),
          });
        }

        // ─────────────────────────────────────────────────────────────
        // 11. WORKLOAD-REPORT
        // ─────────────────────────────────────────────────────────────
        case 'workload-report': {
          // Team members in manager's department
          const teamMembers = await db.user.findMany({
            where: { departmentId, isActive: true },
            select: { id: true, name: true, email: true, position: true },
          });

          // All department tasks
          const deptTasks = await db.task.findMany({
            where: { departmentId },
            select: {
              id: true,
              assigneeId: true,
              status: true,
              priority: true,
              completedAt: true,
              createdAt: true,
            },
          });

          // Per-member workload
          const memberWorkload = teamMembers.map((member) => {
            const memberTasks = deptTasks.filter((t) => t.assigneeId === member.id);
            const completedTasks = memberTasks.filter((t) => t.status === 'DONE' && t.completedAt);

            // Avg completion time
            let avgCompletionDays = 0;
            if (completedTasks.length > 0) {
              const totalDays = completedTasks.reduce((sum, t) => {
                const diff =
                  (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24);
                return sum + diff;
              }, 0);
              avgCompletionDays = Math.round((totalDays / completedTasks.length) * 10) / 10;
            }

            return {
              userId: member.id,
              userName: member.name,
              position: member.position || undefined,
              total: memberTasks.length,
              todo: memberTasks.filter((t) => t.status === 'TODO').length,
              inProgress: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
              inReview: memberTasks.filter((t) => t.status === 'IN_REVIEW').length,
              done: memberTasks.filter((t) => t.status === 'DONE').length,
              blocked: memberTasks.filter((t) => t.status === 'BLOCKED' || t.status === 'BLOCKED').length,
              byPriority: {
                low: memberTasks.filter((t) => t.priority === 'LOW').length,
                medium: memberTasks.filter((t) => t.priority === 'MEDIUM').length,
                high: memberTasks.filter((t) => t.priority === 'HIGH').length,
                urgent: memberTasks.filter((t) => t.priority === 'URGENT').length,
              },
              avgCompletionDays,
            };
          });

          // Totals
          const totalEstimated = deptTasks.filter((t) => t.status !== 'DONE').length;
          const totalCompleted = deptTasks.filter((t) => t.status === 'DONE').length;

          // Department-level avg completion
          const allCompleted = deptTasks.filter((t) => t.status === 'DONE' && t.completedAt);
          let deptAvgCompletionDays = 0;
          if (allCompleted.length > 0) {
            const totalDays = allCompleted.reduce((sum, t) => {
              const diff =
                (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + diff;
            }, 0);
            deptAvgCompletionDays = Math.round((totalDays / allCompleted.length) * 10) / 10;
          }

          return NextResponse.json({
            status: 'success',
            data: {
              departmentId,
              memberWorkload,
              totals: {
                totalTasks: deptTasks.length,
                totalEstimated,
                totalCompleted,
                avgCompletionDays: deptAvgCompletionDays,
                teamSize: teamMembers.length,
              },
            },
          });
        }

        default:
          return NextResponse.json(
            { status: 'error', message: `Unknown action: ${action}` },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Tasks Manager POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to process manager task action' },
        { status: 500 }
      );
    }
  });
}
