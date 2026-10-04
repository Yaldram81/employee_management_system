import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { emitRealtimeEvent, RealtimeEvents } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const category = searchParams.get('category');
      const priority = searchParams.get('priority');
      const severity = searchParams.get('severity');
      const departmentId = searchParams.get('departmentId');
      const userId = searchParams.get('userId');
      const action = searchParams.get('action');

      const includeOpts = {
        user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
        department: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        resolver: { select: { id: true, name: true } },
        escalator: { select: { id: true, name: true } },
      };

      // Dashboard metrics
      if (action === 'dashboard') {
        const allComplaints = await db.complaint.findMany({ include: includeOpts, orderBy: { createdAt: 'desc' } });
        const total = allComplaints.length;
        const open = allComplaints.filter(c => c.status === 'OPEN').length;
        const investigating = allComplaints.filter(c => c.status === 'INVESTIGATING').length;
        const inProgress = allComplaints.filter(c => c.status === 'IN_PROGRESS').length;
        const resolved = allComplaints.filter(c => c.status === 'RESOLVED').length;
        const closed = allComplaints.filter(c => c.status === 'CLOSED').length;
        const escalated = allComplaints.filter(c => c.status === 'ESCALATED').length;

        const categoryDist: Record<string, number> = {};
        allComplaints.forEach(c => { const cat = (c.category || 'GENERAL').toLowerCase(); categoryDist[cat] = (categoryDist[cat] || 0) + 1; });
        const deptDist: Record<string, number> = {};
        allComplaints.forEach(c => { const dept = c.department?.name || c.user?.department?.name || 'Unassigned'; deptDist[dept] = (deptDist[dept] || 0) + 1; });
        const priorityDist: Record<string, number> = {};
        allComplaints.forEach(c => { const p = (c.priority || 'MEDIUM').toLowerCase(); priorityDist[p] = (priorityDist[p] || 0) + 1; });
        const severityDist: Record<string, number> = {};
        allComplaints.forEach(c => { const s = (c.severity || 'NORMAL').toLowerCase(); severityDist[s] = (severityDist[s] || 0) + 1; });

        const resolvedComplaints = allComplaints.filter(c => c.resolvedAt && c.createdAt);
        const avgResolutionMs = resolvedComplaints.length > 0
          ? resolvedComplaints.reduce((sum, c) => sum + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()), 0) / resolvedComplaints.length
          : 0;
        const avgResolutionHours = Math.round(avgResolutionMs / (1000 * 60 * 60) * 10) / 10;

        const slaCompliant = resolvedComplaints.filter(c => (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) <= 72 * 60 * 60 * 1000).length;
        const slaRate = resolvedComplaints.length > 0 ? Math.round((slaCompliant / resolvedComplaints.length) * 100) : 100;
        const anonymousCount = allComplaints.filter(c => c.isAnonymous).length;
        const criticalOpen = allComplaints.filter(c => (c.priority === 'CRITICAL' || c.severity === 'CRITICAL') && ['OPEN', 'INVESTIGATING', 'IN_PROGRESS', 'ESCALATED'].includes(c.status)).length;

        const recentActivity = allComplaints.slice(0, 10).map(c => ({
          id: c.id, subject: c.subject, category: c.category, status: c.status, priority: c.priority,
          userName: c.isAnonymous ? 'Anonymous' : (c.user?.name || ''), createdAt: c.createdAt, resolvedAt: c.resolvedAt,
        }));

        return NextResponse.json({ status: 'success', data: { metrics: { total, open, investigating, inProgress, resolved, closed, escalated, avgResolutionHours, slaRate, anonymousCount, criticalOpen }, categoryDist, deptDist, priorityDist, severityDist, recentActivity } });
      }

      // Regular list query
      const where: Record<string, unknown> = {};
      if (status) where.status = status.toUpperCase();
      if (category) where.category = category.toUpperCase();
      if (priority) where.priority = priority.toUpperCase();
      if (severity) where.severity = severity.toUpperCase();
      if (departmentId) where.departmentId = departmentId;

      const userRole = user.role.toLowerCase();
      if (userRole === 'employee') { where.userId = user.userId; }
      if (userRole === 'manager') {
        const managerDept = await db.department.findFirst({ where: { managerId: user.userId } });
        if (managerDept && !userId) { where.OR = [{ departmentId: managerDept.id }, { userId: user.userId }]; }
        else if (userId) { where.userId = userId; }
      }
      if (userRole === 'admin' && userId) { where.userId = userId; }

      const complaints = await db.complaint.findMany({ where, include: includeOpts, orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ status: 'success', message: 'Complaints fetched successfully', data: complaints });
    } catch (error) {
      console.error('Complaints GET error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch complaints' }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { subject, description, category, priority, isAnonymous, severity, departmentId, dueDate } = body;

      if (!subject || !description) {
        return NextResponse.json({ status: 'error', message: 'Subject and description are required' }, { status: 400 });
      }

      let deptId = departmentId || null;
      if (!isAnonymous && !deptId) {
        const userRecord = await db.user.findUnique({ where: { id: user.userId } });
        deptId = userRecord?.departmentId || null;
      }

      const complaint = await db.complaint.create({
        data: {
          userId: isAnonymous ? null : user.userId, subject, description,
          category: (category || 'GENERAL').toUpperCase(), priority: (priority || 'MEDIUM').toUpperCase(),
          status: 'OPEN', isAnonymous: isAnonymous || false, severity: (severity || 'NORMAL').toUpperCase(),
          departmentId: deptId, dueDate: dueDate || null,
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
          department: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          resolver: { select: { id: true, name: true } },
          escalator: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json({ status: 'success', message: 'Complaint submitted successfully', data: complaint }, { status: 201 });
    } catch (error) {
      console.error('Complaints POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to submit complaint' }, { status: 500 });
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, status, resolutionNotes, assignedToId, priority, severity, category, dueDate, action } = body;

      // ─── Enterprise Actions ──────────────────────────────────
      if (action === 'delegate') {
        if (!id || !assignedToId) return NextResponse.json({ status: 'error', message: 'Complaint ID and assignee required' }, { status: 400 });
        const existing = await db.complaint.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ status: 'error', message: 'Complaint not found' }, { status: 404 });
        const complaint = await db.complaint.update({
          where: { id },
          data: { assignedToId, status: existing.status === 'OPEN' ? 'INVESTIGATING' : existing.status },
          include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } }, department: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } }, resolver: { select: { id: true, name: true } }, escalator: { select: { id: true, name: true } } },
        });
        // Create notification for assignee
        try {
          const notification = await db.notification.create({ data: { userId: assignedToId, title: 'Complaint Delegated', message: `Complaint "${existing.subject}" has been delegated to you`, type: 'COMPLAINT_UPDATE' } });
          // Push real-time notification
          emitRealtimeEvent(assignedToId, RealtimeEvents.NOTIFICATION_NEW, {
            id: notification.id, userId: assignedToId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
          }).catch(() => {});
          emitRealtimeEvent(assignedToId, RealtimeEvents.COMPLAINT_STATUS_CHANGED, { complaintId: id, status: 'DELEGATED' }).catch(() => {});
        } catch {}
        return NextResponse.json({ status: 'success', message: 'Complaint delegated', data: complaint });
      }

      if (action === 'request-info') {
        if (!id) return NextResponse.json({ status: 'error', message: 'Complaint ID required' }, { status: 400 });
        const existing = await db.complaint.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ status: 'error', message: 'Complaint not found' }, { status: 404 });
        // Notify the reporter
        if (existing.userId) {
          try {
            const notification = await db.notification.create({ data: { userId: existing.userId, title: 'Additional Information Requested', message: `More information is needed for your complaint "${existing.subject}"`, type: 'COMPLAINT_UPDATE' } });
            // Push real-time notification
            emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
              id: notification.id, userId: existing.userId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
            }).catch(() => {});
          } catch {}
        }
        return NextResponse.json({ status: 'success', message: 'Info request sent to reporter' });
      }

      if (action === 'return-for-revision') {
        if (!id) return NextResponse.json({ status: 'error', message: 'Complaint ID required' }, { status: 400 });
        const existing = await db.complaint.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ status: 'error', message: 'Complaint not found' }, { status: 404 });
        const complaint = await db.complaint.update({
          where: { id },
          data: { status: 'OPEN', resolvedAt: null, resolvedById: null, resolutionNotes: null },
          include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } }, department: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } }, resolver: { select: { id: true, name: true } }, escalator: { select: { id: true, name: true } } },
        });
        if (existing.userId) {
          try {
            const notification = await db.notification.create({ data: { userId: existing.userId, title: 'Complaint Reopened', message: `Your complaint "${existing.subject}" has been reopened for revision`, type: 'COMPLAINT_UPDATE' } });
            // Push real-time notification
            emitRealtimeEvent(existing.userId, RealtimeEvents.NOTIFICATION_NEW, {
              id: notification.id, userId: existing.userId, title: notification.title, message: notification.message, type: notification.type, createdAt: notification.createdAt,
            }).catch(() => {});
            emitRealtimeEvent(existing.userId, RealtimeEvents.COMPLAINT_STATUS_CHANGED, { complaintId: id, status: 'OPEN' }).catch(() => {});
          } catch {}
        }
        return NextResponse.json({ status: 'success', message: 'Complaint returned for revision', data: complaint });
      }

      if (action === 'merge') {
        const { targetIds }: { targetIds?: string[] } = body;
        if (!id || !targetIds?.length) return NextResponse.json({ status: 'error', message: 'Complaint ID and target IDs required' }, { status: 400 });
        // Close merged complaints
        for (const tid of targetIds) {
          try { await db.complaint.update({ where: { id: tid }, data: { status: 'CLOSED', closedAt: new Date(), resolutionNotes: `Merged into complaint #${id}` } }); } catch {}
        }
        return NextResponse.json({ status: 'success', message: `${targetIds.length} complaints merged` });
      }

      if (action === 'bulk-update') {
        const { ids, updates }: { ids?: string[]; updates?: Record<string, unknown> } = body;
        if (!ids?.length || !updates) return NextResponse.json({ status: 'error', message: 'IDs and updates required' }, { status: 400 });
        const data: Record<string, unknown> = {};
        if (updates.status) { data.status = (updates.status as string).toUpperCase(); if (data.status === 'RESOLVED') { data.resolvedById = user.userId; data.resolvedAt = new Date(); } if (data.status === 'CLOSED') { data.closedAt = new Date(); } if (data.status === 'ESCALATED') { data.escalatedAt = new Date(); data.escalatedById = user.userId; } }
        if (updates.priority) data.priority = (updates.priority as string).toUpperCase();
        if (updates.severity) data.severity = (updates.severity as string).toUpperCase();
        if (updates.category) data.category = (updates.category as string).toUpperCase();
        if (updates.assignedToId) data.assignedToId = updates.assignedToId;
        let updated = 0;
        for (const cid of ids) { try { await db.complaint.update({ where: { id: cid }, data }); updated++; } catch {} }
        return NextResponse.json({ status: 'success', message: `${updated} complaints updated` });
      }

      // ─── Standard PATCH ──────────────────────────────────────
      if (!id) return NextResponse.json({ status: 'error', message: 'Complaint ID is required' }, { status: 400 });

      const existing = await db.complaint.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ status: 'error', message: 'Complaint not found' }, { status: 404 });

      const data: Record<string, unknown> = {};
      if (status) {
        const validStatuses = ['OPEN', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];
        const normalizedStatus = status.toUpperCase().replace(/-/g, '_');
        if (!validStatuses.includes(normalizedStatus)) return NextResponse.json({ status: 'error', message: `Invalid status` }, { status: 400 });
        const upperStatus = normalizedStatus;
        data.status = upperStatus;
        if (upperStatus === 'RESOLVED') { data.resolvedById = user.userId; data.resolvedAt = new Date(); }
        else if (upperStatus === 'CLOSED') { data.closedAt = new Date(); if (!existing.resolvedById) { data.resolvedById = user.userId; data.resolvedAt = new Date(); } }
        else if (upperStatus === 'ESCALATED') { data.escalatedAt = new Date(); data.escalatedById = user.userId; }
        if (['RESOLVED', 'CLOSED', 'ESCALATED'].includes(upperStatus) && !['admin', 'manager'].includes(user.role.toLowerCase())) {
          return NextResponse.json({ status: 'error', message: 'Insufficient permissions' }, { status: 403 });
        }
      }
      if (resolutionNotes !== undefined) data.resolutionNotes = resolutionNotes;
      if (assignedToId !== undefined) data.assignedToId = assignedToId;
      if (priority) data.priority = priority.toUpperCase();
      if (severity) data.severity = severity.toUpperCase();
      if (category) data.category = category.toUpperCase();
      if (dueDate !== undefined) data.dueDate = dueDate;
      if (assignedToId && !['admin', 'manager'].includes(user.role.toLowerCase())) {
        return NextResponse.json({ status: 'error', message: 'Only managers and admins can assign complaints' }, { status: 403 });
      }
      if (Object.keys(data).length === 0) return NextResponse.json({ status: 'error', message: 'No updates provided' }, { status: 400 });

      const complaint = await db.complaint.update({
        where: { id }, data,
        include: { user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } }, department: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } }, resolver: { select: { id: true, name: true } }, escalator: { select: { id: true, name: true } } },
      });

      return NextResponse.json({ status: 'success', message: 'Complaint updated successfully', data: complaint });
    } catch (error) {
      console.error('Complaints PATCH error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to update complaint' }, { status: 500 });
    }
  });
}

export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ status: 'error', message: 'Complaint ID required' }, { status: 400 });

      const existing = await db.complaint.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ status: 'error', message: 'Complaint not found' }, { status: 404 });

      // Managers can only delete their department's complaints
      if (user.role.toLowerCase() === 'manager') {
        const dept = await db.department.findFirst({ where: { managerId: user.userId } });
        if (dept && existing.departmentId !== dept.id && existing.userId !== user.userId) {
          return NextResponse.json({ status: 'error', message: 'Can only delete department complaints' }, { status: 403 });
        }
      }

      await db.complaint.delete({ where: { id } });
      return NextResponse.json({ status: 'success', message: 'Complaint deleted' });
    } catch (error) {
      console.error('Complaints DELETE error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to delete complaint' }, { status: 500 });
    }
  });
}
