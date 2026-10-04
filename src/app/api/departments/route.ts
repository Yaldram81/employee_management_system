import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      const scope = searchParams.get('scope'); // 'mine' for employee's own dept only

      const role = user.role.toLowerCase();
      const where: Record<string, unknown> = {};
      if (name) where.name = { contains: name };

      // ─── Role-based row-level scoping ─────────────────────────
      if (role === 'employee' && scope === 'mine') {
        // Employees with scope=mine only get their own department
        const emp = await db.user.findUnique({
          where: { id: user.userId },
          select: { departmentId: true },
        });
        if (emp?.departmentId) {
          where.id = emp.departmentId;
        }
      }

      // ─── Field-level scoping based on role ────────────────────
      const isAdmin = role === 'admin';

      const departments = await db.department.findMany({
        where,
        include: {
          manager: {
            select: isAdmin
              ? { id: true, name: true, email: true, role: true, position: true }
              : { id: true, name: true }, // No email/role/position for non-admins
          },
          _count: {
            select: {
              users: true,
              ...(isAdmin ? { tasks: true, teams: true } : {}), // Skip task/team counts for non-admins
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Strip budget for non-admin roles
      const sanitized = !isAdmin
        ? departments.map(({ budget, ...rest }) => rest)
        : departments;

      return NextResponse.json({
        status: 'success',
        message: 'Departments fetched successfully',
        data: sanitized,
      });
    } catch (error) {
      console.error('Departments GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch departments' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { name, description, color, icon, location, budget, managerId } = body;

      if (!name) {
        return NextResponse.json(
          { status: 'error', message: 'Department name is required' },
          { status: 400 }
        );
      }

      const existing = await db.department.findUnique({ where: { name } });
      if (existing) {
        return NextResponse.json(
          { status: 'error', message: 'Department name already exists' },
          { status: 409 }
        );
      }

      // Check if managerId is already assigned to another department
      if (managerId) {
        const existingDept = await db.department.findFirst({
          where: { managerId },
          include: { manager: { select: { name: true } } },
        });
        if (existingDept) {
          return NextResponse.json(
            { status: 'error', message: `This manager is already assigned to department "${existingDept.name}"` },
            { status: 409 }
          );
        }
      }

      const department = await db.department.create({
        data: {
          name,
          description: description || null,
          color: color || '#10b981',
          icon: icon || 'Building2',
          location: location || null,
          budget: budget || null,
          managerId: managerId || null,
        },
        include: {
          manager: { select: { id: true, name: true, email: true, role: true, position: true } },
          _count: { select: { users: true, tasks: true, teams: true } },
        },
      });

      return NextResponse.json(
        {
          status: 'success',
          message: 'Department created successfully',
          data: department,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Departments POST error:', error);
      // Detect Prisma unique constraint violation
      if (error?.code === 'P2002') {
        const target = error?.meta?.target as string[] | undefined;
        if (target?.includes('managerId')) {
          return NextResponse.json(
            { status: 'error', message: 'This manager is already assigned to another department' },
            { status: 409 }
          );
        }
        if (target?.includes('name')) {
          return NextResponse.json(
            { status: 'error', message: 'Department name already exists' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { status: 'error', message: 'A unique constraint violation occurred' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { status: 'error', message: 'Failed to create department' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { id, name, description, color, icon, location, budget, managerId, isActive } = body;

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'Department ID is required' },
          { status: 400 }
        );
      }

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description || null;
      if (color !== undefined) data.color = color;
      if (icon !== undefined) data.icon = icon;
      if (location !== undefined) data.location = location || null;
      if (budget !== undefined) data.budget = budget;
      if (managerId !== undefined) data.managerId = managerId || null;
      if (isActive !== undefined) data.isActive = isActive;

      const department = await db.department.update({
        where: { id },
        data,
        include: {
          manager: { select: { id: true, name: true, email: true, role: true, position: true } },
          _count: { select: { users: true, tasks: true, teams: true } },
        },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Department updated successfully',
        data: department,
      });
    } catch (error) {
      console.error('Departments PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update department' },
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
          { status: 'error', message: 'Department ID is required' },
          { status: 400 }
        );
      }

      // Check if department has users
      const userCount = await db.user.count({ where: { departmentId: id } });
      if (userCount > 0) {
        return NextResponse.json(
          { status: 'error', message: `Cannot delete department with ${userCount} assigned employees. Reassign them first.` },
          { status: 409 }
        );
      }

      await db.department.delete({ where: { id } });

      return NextResponse.json({
        status: 'success',
        message: 'Department deleted successfully',
      });
    } catch (error) {
      console.error('Departments DELETE error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to delete department' },
        { status: 500 }
      );
    }
  });
}
