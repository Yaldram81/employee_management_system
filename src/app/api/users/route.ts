import { db } from '@/lib/db';
import { requireAuth, requireRole, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get('role');
      const departmentId = searchParams.get('departmentId');
      const scope = searchParams.get('scope'); // 'colleagues' for employee access
      const userRole = user.role.toLowerCase();

      // ─── Employees get limited colleague access ────────────────
      if (userRole === 'employee') {
        // Only allow 'colleagues' scope — same department colleagues
        const emp = await db.user.findUnique({
          where: { id: user.userId },
          select: { departmentId: true },
        });

        const where: Record<string, unknown> = {
          isActive: true,
        };

        // If scope=colleagues, show same-department colleagues
        if (scope === 'colleagues' && emp?.departmentId) {
          where.departmentId = emp.departmentId;
        } else {
          // Default: just return the user's own profile
          where.id = user.userId;
        }

        const users = await db.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
            avatarUrl: true,
            position: true,
            workMode: true,
            department: { select: { id: true, name: true } },
            shift: { select: { id: true, name: true } },
            // NO pinCode, salary, phone, joinDate for employees
          },
          orderBy: { name: 'asc' },
        });

        return NextResponse.json({
          status: 'success',
          message: 'Users fetched successfully',
          data: users,
        });
      }

      // ─── Manager / Admin access ──────────────────────────────
      const where: Record<string, unknown> = {};
      if (role) where.role = role;
      if (departmentId) where.departmentId = departmentId;

      // Managers auto-scope to their department unless explicitly requesting all
      if (userRole === 'manager' && !departmentId) {
        const mgr = await db.user.findUnique({
          where: { id: user.userId },
          select: { departmentId: true },
        });
        if (mgr?.departmentId) {
          where.departmentId = mgr.departmentId;
        }
      }

      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          // Strip pinCode for managers (only admin sees it)
          ...(userRole === 'admin' ? { pinCode: true } : {}),
          avatarUrl: true,
          isActive: true,
          workMode: true,
          phone: true,
          position: true,
          joinDate: true,
          // Strip salary for managers (only admin sees it)
          ...(userRole === 'admin' ? { salary: true } : {}),
          createdAt: true,
          updatedAt: true,
          department: { select: { id: true, name: true } },
          managedDepartment: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true } },
          shiftId: true,
          _count: {
            select: {
              attendance: true,
              assignedTasks: true,
              leaves: true,
              requests: true,
              complaints: true,
              teamMembers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        status: 'success',
        message: 'Users fetched successfully',
        data: users,
      });
    } catch (error) {
      console.error('Users GET error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch users' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async (user) => {
    try {
      const body = await request.json();
      const { name, email, password, role, departmentId, pinCode, avatarUrl } = body;

      if (!name || !email || !password) {
        return NextResponse.json(
          { status: 'error', message: 'Name, email, and password are required' },
          { status: 400 }
        );
      }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { status: 'error', message: 'Email already exists' },
          { status: 409 }
        );
      }

      // Hash password with bcrypt before storing
      const hashedPassword = await hashPassword(password);

      const newUser = await db.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
          role: (role || 'EMPLOYEE').toUpperCase(),
          departmentId: departmentId || null,
          pinCode: pinCode || null,
          avatarUrl: avatarUrl || null,
          phone: body.phone || null,
          position: body.position || null,
          workMode: (body.workMode || 'OFFICE').toUpperCase(),
          salary: body.salary ? parseFloat(body.salary) : null,
          joinDate: body.joinDate ? new Date(body.joinDate) : null,
        },
        include: { department: true, managedDepartment: true, shift: true },
      });

      const { passwordHash, ...userWithoutPassword } = newUser;

      return NextResponse.json(
        {
          status: 'success',
          message: 'User created successfully',
          data: userWithoutPassword,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Users POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to create user' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const body = await request.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'User ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'User not found' },
          { status: 404 }
        );
      }

      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.email !== undefined) data.email = updates.email;
      if (updates.role !== undefined) data.role = updates.role.toUpperCase();
      if (updates.departmentId !== undefined) data.departmentId = updates.departmentId || null;
      if (updates.pinCode !== undefined) data.pinCode = updates.pinCode || null;
      if (updates.avatarUrl !== undefined) data.avatarUrl = updates.avatarUrl || null;
      if (updates.isActive !== undefined) data.isActive = updates.isActive;
      if (updates.workMode !== undefined) data.workMode = updates.workMode.toUpperCase();
      if (updates.phone !== undefined) data.phone = updates.phone || null;
      if (updates.position !== undefined) data.position = updates.position || null;
      if (updates.salary !== undefined) data.salary = updates.salary ? parseFloat(updates.salary) : null;
      if (updates.joinDate !== undefined) data.joinDate = updates.joinDate ? new Date(updates.joinDate) : null;
      if (updates.shiftId !== undefined) data.shiftId = updates.shiftId || null;
      if (updates.password !== undefined) data.passwordHash = await hashPassword(updates.password);

      const updatedUser = await db.user.update({
        where: { id },
        data,
        include: { department: true, managedDepartment: true, shift: true },
      });

      const { passwordHash, ...userWithoutPassword } = updatedUser;

      return NextResponse.json({
        status: 'success',
        message: 'User updated successfully',
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Users PATCH error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to update user' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { status: 'error', message: 'User ID is required' },
          { status: 400 }
        );
      }

      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { status: 'error', message: 'User not found' },
          { status: 404 }
        );
      }

      // Instead of deleting, deactivate the user (soft delete)
      await db.user.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        status: 'success',
        message: 'User deactivated successfully',
        data: null,
      });
    } catch (error) {
      console.error('Users DELETE error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to deactivate user' },
        { status: 500 }
      );
    }
  });
}
