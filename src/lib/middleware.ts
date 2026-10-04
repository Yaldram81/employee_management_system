/**
 * API Middleware — Rate limiting, request validation, and role-based access control.
 *
 * Usage in API routes:
 *   import { withMiddleware, schemas } from '@/lib/middleware';
 *
 *   export async function POST(request: NextRequest) {
 *     return withMiddleware(request, {
 *       requireAuth: true,
 *       allowedRoles: ['admin', 'manager'],
 *       rateLimit: { windowMs: 60000, maxRequests: 30 },
 *       bodySchema: schemas.createTask,
 *     }, async (user, body) => {
 *       // handler logic — `user` is guaranteed to be authenticated
 *       // `body` is validated against the schema
 *     });
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, type AuthUser } from './auth';

// ─── Rate Limiter ───────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// ─── Validation Schemas ─────────────────────────────────────────────────────

interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'email' | 'date' | 'enum' | 'array';
  required?: boolean;
  enumValues?: string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

type Schema = Record<string, SchemaField>;

function validateBody(body: Record<string, unknown>, schema: Schema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, config] of Object.entries(schema)) {
    const value = body[field];

    // Required check
    if (config.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    // Skip further validation if not required and not present
    if (value === undefined || value === null) continue;

    // Type check
    switch (config.type) {
      case 'string':
        if (typeof value !== 'string') errors.push(`Field '${field}' must be a string`);
        if (config.minLength && (value as string).length < config.minLength)
          errors.push(`Field '${field}' must be at least ${config.minLength} characters`);
        if (config.maxLength && (value as string).length > config.maxLength)
          errors.push(`Field '${field}' must be at most ${config.maxLength} characters`);
        break;
      case 'number':
        if (typeof value !== 'number') errors.push(`Field '${field}' must be a number`);
        if (config.min !== undefined && (value as number) < config.min)
          errors.push(`Field '${field}' must be at least ${config.min}`);
        if (config.max !== undefined && (value as number) > config.max)
          errors.push(`Field '${field}' must be at most ${config.max}`);
        break;
      case 'boolean':
        if (typeof value !== 'boolean') errors.push(`Field '${field}' must be a boolean`);
        break;
      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string))
          errors.push(`Field '${field}' must be a valid email`);
        break;
      case 'date':
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value as string))
          errors.push(`Field '${field}' must be a valid date (YYYY-MM-DD)`);
        break;
      case 'enum':
        if (config.enumValues && !config.enumValues.includes(value as string))
          errors.push(`Field '${field}' must be one of: ${config.enumValues.join(', ')}`);
        break;
      case 'array':
        if (!Array.isArray(value)) errors.push(`Field '${field}' must be an array`);
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Pre-defined Schemas ────────────────────────────────────────────────────

export const schemas = {
  login: {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, minLength: 1 },
  },
  createUser: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, minLength: 6 },
    role: { type: 'enum', required: false, enumValues: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    departmentId: { type: 'string', required: false },
    phone: { type: 'string', required: false },
    position: { type: 'string', required: false },
    workMode: { type: 'enum', required: false, enumValues: ['OFFICE', 'REMOTE', 'HYBRID'] },
    salary: { type: 'number', required: false, min: 0 },
  },
  createTask: {
    title: { type: 'string', required: true, minLength: 2, maxLength: 200 },
    description: { type: 'string', required: false, maxLength: 5000 },
    priority: { type: 'enum', required: false, enumValues: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    status: { type: 'enum', required: false, enumValues: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] },
    assigneeId: { type: 'string', required: false },
    dueDate: { type: 'date', required: false },
    departmentId: { type: 'string', required: false },
    teamId: { type: 'string', required: false },
  },
  applyLeave: {
    type: { type: 'enum', required: true, enumValues: ['SICK', 'CASUAL', 'VACATION', 'MATERNITY', 'PATERNITY', 'UNPAID'] },
    startDate: { type: 'date', required: true },
    endDate: { type: 'date', required: true },
    reason: { type: 'string', required: true, minLength: 5, maxLength: 1000 },
  },
  createRequest: {
    type: { type: 'enum', required: true, enumValues: ['LEAVE', 'EXPENSE', 'ASSET', 'SHIFT_SWAP', 'TRAINING', 'EQUIPMENT', 'TRAVEL', 'IT_SUPPORT'] },
    title: { type: 'string', required: true, minLength: 2, maxLength: 200 },
    description: { type: 'string', required: true, minLength: 5, maxLength: 2000 },
    priority: { type: 'enum', required: false, enumValues: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    amount: { type: 'number', required: false, min: 0 },
  },
  createComplaint: {
    subject: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    description: { type: 'string', required: true, minLength: 10, maxLength: 5000 },
    category: { type: 'enum', required: false, enumValues: ['HR', 'IT', 'FACILITIES', 'FINANCE', 'MANAGEMENT', 'SECURITY', 'GENERAL', 'OTHER'] },
    priority: { type: 'enum', required: false, enumValues: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    isAnonymous: { type: 'boolean', required: false },
  },
  createDepartment: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    description: { type: 'string', required: false, maxLength: 500 },
    color: { type: 'string', required: false },
    icon: { type: 'string', required: false },
    location: { type: 'string', required: false },
    budget: { type: 'number', required: false, min: 0 },
  },
  uploadFile: {
    entityType: { type: 'enum', required: true, enumValues: ['request', 'complaint', 'leave', 'task', 'profile', 'investment', 'onboarding'] },
    entityId: { type: 'string', required: true },
    category: { type: 'string', required: false },
  },
} as const;

// ─── Middleware Configuration ────────────────────────────────────────────────

interface MiddlewareConfig {
  requireAuth?: boolean;
  allowedRoles?: string[];  // If empty or undefined, any authenticated role is allowed
  rateLimit?: RateLimitConfig;
  bodySchema?: Schema;
}

type MiddlewareHandler = (user: AuthUser | null, body: Record<string, unknown>) => Promise<NextResponse>;

// ─── Main Middleware Function ────────────────────────────────────────────────

export function withMiddleware(
  request: NextRequest,
  config: MiddlewareConfig,
  handler: MiddlewareHandler
): Promise<NextResponse> {
  // 1. Rate limiting
  if (config.rateLimit) {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userId = request.headers.get('authorization')?.substring(7, 20) || clientIp;
    const key = `${request.method}:${request.nextUrl.pathname}:${userId}`;

    const result = checkRateLimit(key, config.rateLimit);
    if (!result.allowed) {
      return Promise.resolve(
        NextResponse.json(
          { status: 'error', message: 'Rate limit exceeded', retryAfter: result.retryAfter },
          {
            status: 429,
            headers: { 'Retry-After': String(result.retryAfter || 60) },
          }
        )
      );
    }
  }

  // 2. Authentication
  let user: AuthUser | null = null;
  if (config.requireAuth) {
    user = verifyAuth(request);
    if (!user) {
      return Promise.resolve(
        NextResponse.json(
          { status: 'error', message: 'Authentication required' },
          { status: 401 }
        )
      );
    }
  } else {
    // Try to extract auth info even if not required
    user = verifyAuth(request);
  }

  // 3. Role-based access control
  if (config.allowedRoles && config.allowedRoles.length > 0 && user) {
    if (!config.allowedRoles.includes(user.role.toLowerCase())) {
      return Promise.resolve(
        NextResponse.json(
          { status: 'error', message: 'Insufficient permissions' },
          { status: 403 }
        )
      );
    }
  }

  // 4. Body validation (only for methods with bodies)
  if (config.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return request.json().then((body) => {
      const validation = validateBody(body, config.bodySchema!);
      if (!validation.valid) {
        return NextResponse.json(
          { status: 'error', message: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }
      return handler(user, body);
    }).catch(() => {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON body' },
        { status: 400 }
      );
    });
  }

  // 5. No body validation needed — proceed
  return handler(user, {});
}

// ─── Convenience Wrappers ───────────────────────────────────────────────────

/** Admin-only middleware shortcut */
export function adminOnly(request: NextRequest, handler: MiddlewareHandler) {
  return withMiddleware(request, {
    requireAuth: true,
    allowedRoles: ['admin'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
  }, handler);
}

/** Manager+Admin middleware shortcut */
export function managerUp(request: NextRequest, handler: MiddlewareHandler) {
  return withMiddleware(request, {
    requireAuth: true,
    allowedRoles: ['admin', 'manager'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
  }, handler);
}

/** Any authenticated user middleware shortcut */
export function authOnly(request: NextRequest, handler: MiddlewareHandler) {
  return withMiddleware(request, {
    requireAuth: true,
    rateLimit: { windowMs: 60000, maxRequests: 120 },
  }, handler);
}
