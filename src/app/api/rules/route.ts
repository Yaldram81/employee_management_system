import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const triggerEvent = searchParams.get('triggerEvent');
      const isActive = searchParams.get('isActive');

      const where: Record<string, unknown> = {};
      if (triggerEvent) where.triggerEvent = triggerEvent;
      if (isActive !== null && isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const rules = await db.systemRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Rules fetched successfully',
        data: rules,
      });
    } catch (error) {
      console.error('Rules GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch rules' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { name, triggerEvent, conditionCount, action, actionValue, isActive } = body;

      if (!name || !triggerEvent || !action) {
        return NextResponse.json(
          { status: 'error', message: 'Name, trigger event, and action are required' },
          { status: 400 }
        );
      }

      const rule = await db.systemRule.create({
        data: {
          name,
          triggerEvent,
          conditionCount: conditionCount || 1,
          action,
          actionValue: actionValue ? (typeof actionValue === 'string' ? actionValue : JSON.stringify(actionValue)) : null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      return NextResponse.json(
        {
          status: 'success',
          message: 'Rule created successfully',
          data: rule,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Rules POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create rule' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { id, name, triggerEvent, conditionCount, action, actionValue, isActive } = body;

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Rule ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.systemRule.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Rule not found' },
          { status: 404 }
        );
      }

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (triggerEvent !== undefined) data.triggerEvent = triggerEvent;
      if (conditionCount !== undefined) data.conditionCount = conditionCount;
      if (action !== undefined) data.action = action;
      if (actionValue !== undefined) {
        data.actionValue = typeof actionValue === 'string' ? actionValue : JSON.stringify(actionValue);
      }
      if (isActive !== undefined) data.isActive = isActive;

      const rule = await db.systemRule.update({
        where: { id },
        data,
      });

      return NextResponse.json({
        status: 'success',
        message: 'Rule updated successfully',
        data: rule,
      });
    } catch (error) {
      console.error('Rules PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update rule' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Rule ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.systemRule.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'Rule not found' },
          { status: 404 }
        );
      }

      await db.systemRule.delete({ where: { id } });

      return NextResponse.json({
        status: 'success',
        message: 'Rule deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Rules DELETE error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to delete rule' },
        { status: 500 }
      );
    }
  });
}
