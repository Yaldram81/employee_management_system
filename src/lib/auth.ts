import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored hash.
 * Supports:
 * - Bcrypt hashes ($2a$, $2b$, $2y$)
 * - Web PBKDF2 hashes (webpbkdf2:...) — legacy from previous implementation
 * - Node PBKDF2 hashes (pbkdf2:...) — legacy
 * - Plaintext — legacy fallback for migration
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Bcrypt format — primary
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcryptCompare(password, hash);
  }

  // Web PBKDF2 format — legacy compatibility
  if (hash.startsWith('webpbkdf2:')) {
    try {
      const { verifyPassword: verifyPbkdf2 } = await import('@/lib/password');
      return verifyPbkdf2(password, hash);
    } catch {
      return false;
    }
  }

  // Node PBKDF2 format — legacy compatibility
  if (hash.startsWith('pbkdf2:')) {
    try {
      const { verifyPassword: verifyPbkdf2 } = await import('@/lib/password');
      return verifyPbkdf2(password, hash);
    } catch {
      return false;
    }
  }

  // Legacy fallback: plaintext comparison (for unmigrated passwords)
  return password === hash;
}

/**
 * Check if a stored value is already a properly hashed password.
 * Returns true for bcrypt, PBKDF2, or any recognized hash format.
 */
export function isHashed(value: string): boolean {
  return (
    value.startsWith('$2a$') ||
    value.startsWith('$2b$') ||
    value.startsWith('$2y$') ||
    value.startsWith('webpbkdf2:') ||
    value.startsWith('pbkdf2:')
  );
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verifies the Authorization header token and returns the decoded user info.
 * Returns null if token is missing or invalid.
 */
export function verifyAuth(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!decoded.userId || !decoded.role) return null;
    return decoded as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Middleware that requires authentication.
 * Returns 401 if not authenticated.
 */
export function requireAuth(
  request: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = verifyAuth(request);
  if (!user) {
    return Promise.resolve(
      NextResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 }
      )
    );
  }
  return handler(user);
}

/**
 * Middleware that requires authentication AND specific roles.
 * Returns 401 if not authenticated, 403 if role not authorized.
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: string[],
  handler: (user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = verifyAuth(request);
  if (!user) {
    return Promise.resolve(
      NextResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 }
      )
    );
  }
  if (!allowedRoles.includes(user.role.toLowerCase())) {
    return Promise.resolve(
      NextResponse.json(
        { status: 'error', message: 'Insufficient permissions' },
        { status: 403 }
      )
    );
  }
  return handler(user);
}

/**
 * Optionally extracts auth info if present, but doesn't require it.
 */
export function optionalAuth(request: NextRequest): AuthUser | null {
  return verifyAuth(request);
}
