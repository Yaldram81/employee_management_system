import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// POST /api/seed-employee-data — Seed initial employee portal data
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      let documentsSeeded = 0;
      let announcementsSeeded = 0;
      let sessionsSeeded = 0;

      // ── Seed Announcements (global) ──────────────────────────
      const existingAnnouncements = await db.announcement.count();
      if (existingAnnouncements === 0) {
        const today = new Date();
        const announcementData = [
          {
            title: 'Office Closed for Memorial Day',
            date: new Date(today.getFullYear(), 4, 23).toISOString().split('T')[0],
            priority: 'high',
            category: 'holiday',
            message: 'The office will be closed on Monday for Memorial Day. Enjoy the long weekend!',
          },
          {
            title: 'Q2 Performance Review Cycle Starting',
            date: new Date(today.getFullYear(), 4, 20).toISOString().split('T')[0],
            priority: 'medium',
            category: 'hr',
            message: 'Q2 performance reviews will begin next week. Please complete your self-assessments.',
          },
          {
            title: 'New Health Insurance Benefits Open Enrollment',
            date: new Date(today.getFullYear(), 4, 18).toISOString().split('T')[0],
            priority: 'high',
            category: 'benefits',
            message: 'Open enrollment for new health insurance plans is now available through the HR portal.',
          },
          {
            title: 'Team Building Event — June 15th',
            date: new Date(today.getFullYear(), 4, 15).toISOString().split('T')[0],
            priority: 'low',
            category: 'event',
            message: 'Join us for the annual team building event on June 15th at Central Park.',
          },
          {
            title: 'System Maintenance Window — This Weekend',
            date: new Date(today.getFullYear(), 4, 12).toISOString().split('T')[0],
            priority: 'medium',
            category: 'it',
            message: 'Scheduled system maintenance this Saturday from 10 PM to 2 AM. Some services may be unavailable.',
          },
        ];

        await db.announcement.createMany({ data: announcementData });
        announcementsSeeded = announcementData.length;
      }

      // ── Seed Documents & Login Sessions for each user ─────────
      const users = await db.user.findMany({ where: { isActive: true } });

      for (const user of users) {
        // Documents
        const existingDocs = await db.employeeDocument.count({ where: { userId: user.id } });
        if (existingDocs === 0) {
          const joinDate = user.joinDate ? new Date(user.joinDate) : new Date('2024-01-15');
          const joinDateStr = joinDate.toISOString().split('T')[0];

          const documentData = [
            {
              userId: user.id,
              name: 'Employment Contract',
              type: 'contract',
              date: joinDateStr,
              size: '2.4 MB',
              description: 'Your employment agreement and terms',
            },
            {
              userId: user.id,
              name: 'Non-Disclosure Agreement',
              type: 'contract',
              date: joinDateStr,
              size: '890 KB',
              description: 'NDA signed on joining',
            },
            {
              userId: user.id,
              name: `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Payslip`,
              type: 'payslip',
              date: new Date().toISOString().split('T')[0],
              size: '156 KB',
              description: 'Current month payslip',
            },
            {
              userId: user.id,
              name: 'Performance Certificate 2024',
              type: 'certificate',
              date: new Date(new Date().getFullYear() - 1, 11, 20).toISOString().split('T')[0],
              size: '340 KB',
              description: 'Annual performance certificate',
            },
            {
              userId: user.id,
              name: 'Tax Form W-2',
              type: 'tax',
              date: new Date(new Date().getFullYear(), 1, 1).toISOString().split('T')[0],
              size: '220 KB',
              description: 'Annual tax form',
            },
          ];

          await db.employeeDocument.createMany({ data: documentData });
          documentsSeeded += documentData.length;
        }

        // Login Sessions
        const existingSessions = await db.loginSession.count({ where: { userId: user.id } });
        if (existingSessions === 0) {
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

          const sessionData = [
            {
              userId: user.id,
              device: 'Chrome / macOS',
              ip: '192.168.1.42',
              isCurrent: true,
              loginAt: twoHoursAgo,
            },
            {
              userId: user.id,
              device: 'Safari / iPhone',
              ip: '10.0.0.15',
              isCurrent: false,
              loginAt: oneDayAgo,
              logoutAt: new Date(oneDayAgo.getTime() + 30 * 60 * 1000),
            },
            {
              userId: user.id,
              device: 'Chrome / Windows',
              ip: '172.16.0.8',
              isCurrent: false,
              loginAt: threeDaysAgo,
              logoutAt: new Date(threeDaysAgo.getTime() + 2 * 60 * 60 * 1000),
            },
          ];

          await db.loginSession.createMany({ data: sessionData });
          sessionsSeeded += sessionData.length;
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Employee data seeded successfully',
        data: {
          documentsSeeded,
          announcementsSeeded,
          sessionsSeeded,
          usersProcessed: users.length,
        },
      });
    } catch (error) {
      console.error('Seed employee data error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to seed employee data' },
        { status: 500 }
      );
    }
  });
}
