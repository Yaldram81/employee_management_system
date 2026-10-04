import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/geofences — List all active office geofences
export async function GET(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const geofences = await db.officeGeofence.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      // If no geofences configured, return default demo geofence
      if (geofences.length === 0) {
        return NextResponse.json({
          status: 'success',
          data: [{
            id: 'default-hq',
            name: 'Main Office (Default)',
            latitude: 24.8607,
            longitude: 67.0011,
            radiusMeters: 500,
            address: 'Karachi, Pakistan — HQ',
            isActive: true,
            isDefault: true,
          }],
        });
      }

      return NextResponse.json({
        status: 'success',
        data: geofences,
      });
    } catch (error) {
      console.error('Geofence GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch geofences' },
        { status: 500 }
      );
    }
  });
}

// POST /api/geofences — Create a new geofence (admin only)
export async function POST(request: NextRequest) {
  const { requireRole } = await import('@/lib/auth');
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { name, latitude, longitude, radiusMeters, address } = body;

      if (!name || latitude == null || longitude == null) {
        return NextResponse.json(
          { status: 'error', message: 'Name, latitude, and longitude are required' },
          { status: 400 }
        );
      }

      const geofence = await db.officeGeofence.create({
        data: {
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radiusMeters: parseInt(radiusMeters) || 200,
          address: address || null,
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Geofence created successfully',
        data: geofence,
      });
    } catch (error) {
      console.error('Geofence POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create geofence' },
        { status: 500 }
      );
    }
  });
}
