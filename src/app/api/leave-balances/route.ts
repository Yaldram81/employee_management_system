import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      let userId = searchParams.get('userId');
      const year = searchParams.get('year');

      // Employees can only see their own balances
      if (user.role.toLowerCase() === 'employee') {
        userId = user.userId;
      }

      if (!userId) {
        return NextResponse.json(
          { status: 'error', message: 'userId is required' },
          { status: 400 }
        );
      }

      const currentYear = year ? parseInt(year) : new Date().getFullYear();

      const balances = await db.leaveBalance.findMany({
        where: {
          userId,
          year: currentYear,
        },
        orderBy: { leaveType: 'asc' },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Leave balances fetched successfully',
        data: balances,
      });
    } catch (error) {
      console.error('Leave balances GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch leave balances' },
        { status: 500 }
      );
    }
  });
}
