/**
 * Real-time event emitter utility for the EMS backend.
 * Sends events to the Socket.IO mini-service which then pushes
 * them to connected frontend clients.
 *
 * Usage from API routes:
 *   import { emitRealtimeEvent } from '@/lib/realtime';
 *   await emitRealtimeEvent(userId, 'notification:new', { title, message, type });
 */

const REALTIME_SERVICE_PORT = 3003;

interface RealtimeEvent {
  userId: string;
  event: string;
  data: Record<string, unknown>;
}

interface BroadcastEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Emit a real-time event to a specific user via the Socket.IO service.
 * Non-blocking — failures are logged but don't throw.
 */
export async function emitRealtimeEvent(
  userId: string,
  event: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const payload: RealtimeEvent = { userId, event, data };
    const res = await fetch(`http://localhost:${REALTIME_SERVICE_PORT}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[Realtime] Emit failed: ${res.status} for user ${userId}`);
    }
  } catch (err) {
    // Realtime service might be down — don't block the main API
    console.warn('[Realtime] Service unavailable:', err);
  }
}

/**
 * Broadcast a real-time event to all connected clients.
 * Non-blocking — failures are logged but don't throw.
 */
export async function broadcastRealtimeEvent(
  event: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const payload: BroadcastEvent = { event, data };
    const res = await fetch(`http://localhost:${REALTIME_SERVICE_PORT}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[Realtime] Broadcast failed: ${res.status}`);
    }
  } catch (err) {
    console.warn('[Realtime] Broadcast service unavailable:', err);
  }
}

/**
 * Common event names for type safety.
 */
export const RealtimeEvents = {
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  LEAVE_STATUS_CHANGED: 'leave:status-changed',
  LEAVE_APPLIED: 'leave:applied',
  REQUEST_STATUS_CHANGED: 'request:status-changed',
  COMPLAINT_STATUS_CHANGED: 'complaint:status-changed',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STATUS_CHANGED: 'task:status-changed',
  ATTENDANCE_CLOCK_IN: 'attendance:clock-in',
  ATTENDANCE_CLOCK_OUT: 'attendance:clock-out',
  PAYROLL_STATUS_CHANGED: 'payroll:status-changed',
} as const;

export type RealtimeEventType = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
