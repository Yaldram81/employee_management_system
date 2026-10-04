import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/employee-documents?userId=xxx — Returns documents for a user
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { status: 'error', message: 'userId query parameter is required' },
          { status: 400 }
        );
      }

      const documents = await db.employeeDocument.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      });

      const data = documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        date: doc.date,
        size: doc.size,
        fileUrl: doc.fileUrl,
        description: doc.description,
      }));

      return NextResponse.json({ status: 'success', data });
    } catch (error) {
      console.error('Employee documents GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch documents' },
        { status: 500 }
      );
    }
  });
}

// POST /api/employee-documents — Create a new document
export async function POST(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const body = await request.json();
      const { userId, name, type, date, size, fileUrl, description } = body;

      if (!userId || !name || !date) {
        return NextResponse.json(
          { status: 'error', message: 'userId, name, and date are required' },
          { status: 400 }
        );
      }

      const document = await db.employeeDocument.create({
        data: {
          userId,
          name,
          type: type || 'contract',
          date,
          size: size || '0 KB',
          fileUrl: fileUrl || null,
          description: description || null,
        },
      });

      return NextResponse.json({ status: 'success', data: document }, { status: 201 });
    } catch (error) {
      console.error('Employee documents POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create document' },
        { status: 500 }
      );
    }
  });
}
