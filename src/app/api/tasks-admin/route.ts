import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// POST /api/tasks-admin — Admin TMS actions
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (user) => {
    try {
      const body = await request.json();
      const { action } = body;

      switch (action) {
        case 'dashboard': {
          // Get comprehensive admin TMS dashboard data
          const allTasks = await db.task.findMany({
            where: { parentTaskId: null },
            include: {
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
            },
            orderBy: { createdAt: 'desc' },
          });

          const totalTasks = allTasks.length;
          const openTasks = allTasks.filter(t => ['TODO', 'IN_PROGRESS'].includes(t.status)).length;
          const completedTasks = allTasks.filter(t => t.status === 'DONE').length;
          const blockedTasks = allTasks.filter(t => t.status === 'BLOCKED' || t.isBlocked).length;
          const inReviewTasks = allTasks.filter(t => t.status === 'IN_REVIEW').length;
          const overdueTasks = allTasks.filter(t => {
            if (!t.dueDate || t.status === 'DONE') return false;
            return new Date(t.dueDate) < new Date();
          }).length;

          // Bottleneck radar: per-department stats
          const departments = await db.department.findMany({
            include: { tasks: { where: { parentTaskId: null } } },
          });
          const bottleneckRadar = departments.map(d => ({
            department: d.name,
            openTasks: d.tasks.filter(t => ['TODO', 'IN_PROGRESS'].includes(t.status)).length,
            completedTasks: d.tasks.filter(t => t.status === 'DONE').length,
            ratio: d.tasks.length > 0
              ? Math.round((d.tasks.filter(t => t.status === 'DONE').length / d.tasks.length) * 100)
              : 0,
          }));

          // Get teams with member/task counts (simplified to avoid Prisma crashes)
          const teamsRaw = await db.team.findMany({
            orderBy: { createdAt: 'desc' },
          });
          const teams = await Promise.all(
            teamsRaw.map(async (t) => {
              const members = await db.teamMember.findMany({
                where: { teamId: t.id },
                include: { user: { select: { id: true, name: true, email: true, role: true } } },
              });
              const taskCount = await db.task.count({ where: { teamId: t.id } });
              return { ...t, members, memberCount: members.length, taskCount };
            })
          );

          // Get templates
          const templates = await db.taskTemplate.findMany({ where: { isActive: true } });

          // Get epics (parent tasks with sub-tasks)
          const epics = allTasks.filter(t => t.subTasks && t.subTasks.length > 0);

          return NextResponse.json({
            status: 'success',
            data: {
              metrics: { totalTasks, openTasks, completedTasks, blockedTasks, inReviewTasks, overdueTasks },
              bottleneckRadar,
              teams,
              templates,
              epics,
              allTasks,
            },
          });
        }

        case 'create-epic': {
          const { title, description, subTasks } = body;
          if (!title) {
            return NextResponse.json({ status: 'error', message: 'Title is required' }, { status: 400 });
          }

          // Create parent task (epic)
          const epic = await db.task.create({
            data: {
              title,
              description: description || null,
              reporterId: user.userId,
              departmentId: null,
              status: 'TODO',
              priority: 'HIGH',
            },
          });

          // Create sub-tasks
          if (subTasks?.length) {
            for (const sub of subTasks) {
              await db.task.create({
                data: {
                  title: sub.title,
                  assigneeId: sub.assigneeId || null,
                  priority: sub.priority || 'MEDIUM',
                  dueDate: sub.dueDate || null,
                  parentTaskId: epic.id,
                  departmentId: null,
                  status: 'TODO',
                },
              });
            }
          }

          return NextResponse.json({ status: 'success', data: epic });
        }

        case 'apply-template': {
          const { templateId, userId: targetUserId } = body;
          if (!templateId || !targetUserId) {
            return NextResponse.json({ status: 'error', message: 'templateId and userId are required' }, { status: 400 });
          }

          const template = await db.taskTemplate.findUnique({ where: { id: templateId } });
          if (!template) {
            return NextResponse.json({ status: 'error', message: 'Template not found' }, { status: 404 });
          }

          let items: string[] = [];
          try {
            items = JSON.parse(template.taskItems);
          } catch {
            items = [template.taskItems];
          }

          const created = [];
          for (const item of items) {
            const task = await db.task.create({
              data: {
                title: typeof item === 'string' ? item : item.title || 'Untitled',
                assigneeId: targetUserId,
                departmentId: null,
                status: 'TODO',
                priority: 'MEDIUM',
              },
            });
            created.push(task);
          }

          return NextResponse.json({ status: 'success', data: { created: created.length } });
        }

        case 'review-task': {
          const { taskId, reviewAction, comment } = body;
          if (!taskId || !reviewAction) {
            return NextResponse.json({ status: 'error', message: 'taskId and reviewAction are required' }, { status: 400 });
          }

          const newStatus = reviewAction === 'approve' ? 'DONE' : 'TODO';
          const updateData: Record<string, unknown> = { status: newStatus };
          if (reviewAction === 'approve') {
            updateData.completedAt = new Date();
          }

          const task = await db.task.update({
            where: { id: taskId },
            data: updateData,
          });

          // Add review comment if provided
          if (comment) {
            await db.taskComment.create({
              data: {
                taskId,
                userId: user.userId,
                comment: `[${reviewAction === 'approve' ? 'Approved' : 'Changes Requested'}] ${comment}`,
              },
            });
          }

          return NextResponse.json({ status: 'success', data: task });
        }

        default:
          return NextResponse.json({ status: 'error', message: `Unknown action: ${action}` }, { status: 400 });
      }
    } catch (error) {
      console.error('Tasks Admin POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to process admin task action' }, { status: 500 });
    }
  });
}
