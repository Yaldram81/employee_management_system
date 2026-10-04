import { db } from '@/lib/db';
import { verifyPassword, isHashed, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { status: 'error', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { department: true, managedDepartment: true },
    });

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password using bcrypt (with legacy plaintext fallback)
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { status: 'error', message: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Auto-migrate: if the password was plaintext, hash it now with bcrypt
    if (!isHashed(user.passwordHash)) {
      try {
        const hashed = await hashPassword(password);
        await db.user.update({
          where: { id: user.id },
          data: { passwordHash: hashed },
        });
      } catch (migrationError) {
        // Log but don't block login if migration fails
        console.warn('Password hash migration failed for user', user.id, migrationError);
      }
    }

    // Generate a demo token (base64 encoded user info)
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      status: 'success',
      message: 'Login successful',
      data: { user: userWithoutPassword, token },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
