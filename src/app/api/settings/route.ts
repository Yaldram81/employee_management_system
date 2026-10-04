import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const settings = await db.systemSetting.findMany({
        orderBy: { key: 'asc' },
      });

      // Convert to key-value object for easier consumption
      const settingsObj: Record<string, unknown> = {};
      for (const setting of settings) {
        try {
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Settings fetched successfully',
        data: settingsObj,
      });
    } catch (error) {
      console.error('Settings GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch settings' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();

      if (!body || typeof body !== 'object') {
        return NextResponse.json(
          { status: 'error', message: 'Settings object is required' },
          { status: 400 }
        );
      }

      const updates = [];
      for (const [key, value] of Object.entries(body)) {
        const stringValue = JSON.stringify(value);
        updates.push(
          db.systemSetting.upsert({
            where: { key },
            update: { value: stringValue },
            create: { key, value: stringValue },
          })
        );
      }

      await Promise.all(updates);

      // Return updated settings
      const settings = await db.systemSetting.findMany({ orderBy: { key: 'asc' } });
      const settingsObj: Record<string, unknown> = {};
      for (const setting of settings) {
        try {
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Settings updated successfully',
        data: settingsObj,
      });
    } catch (error) {
      console.error('Settings PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update settings' },
        { status: 500 }
      );
    }
  });
}
