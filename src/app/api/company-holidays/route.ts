import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// GET /api/company-holidays
export async function GET(request: NextRequest) {
  return requireRole(request, ['admin', 'manager', 'employee'], async () => {
    try {
      const holidays = await db.companyHoliday.findMany({ orderBy: { date: 'asc' } });
      return NextResponse.json({ status: 'success', data: holidays });
    } catch (error) {
      console.error('CompanyHolidays GET error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch holidays' }, { status: 500 });
    }
  });
}

// POST /api/company-holidays
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { name, date, type, isRecurring } = body;
      if (!name || !date) {
        return NextResponse.json({ status: 'error', message: 'Name and date are required' }, { status: 400 });
      }

      const holiday = await db.companyHoliday.create({
        data: { name, date, type: type || 'PUBLIC', isRecurring: isRecurring || false },
      });

      return NextResponse.json({ status: 'success', message: 'Holiday created', data: holiday }, { status: 201 });
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('Unique')) {
        return NextResponse.json({ status: 'error', message: 'A holiday already exists on this date' }, { status: 409 });
      }
      console.error('CompanyHoliday POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to create holiday' }, { status: 500 });
    }
  });
}

// DELETE /api/company-holidays
export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ status: 'error', message: 'Holiday ID is required' }, { status: 400 });

      await db.companyHoliday.delete({ where: { id } });
      return NextResponse.json({ status: 'success', message: 'Holiday deleted' });
    } catch (error) {
      console.error('CompanyHoliday DELETE error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to delete holiday' }, { status: 500 });
    }
  });
}
